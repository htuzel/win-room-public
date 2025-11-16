// Win Room v2.0 - POST /api/claim
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, rateLimit } from '@/lib/auth/middleware';
import { transaction, queryOne } from '@/lib/db/connection';
import { insertAchievement } from '@/lib/db/achievements';
import { ClaimRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Rate limit: 10 claims per minute
  if (!rateLimit(`claim:${user.seller_id}`, 10, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    const body: ClaimRequest = await req.json();
    const {
      subscription_id,
      claimed_by,
      claim_type,
      installment_plan_id: planIdFromBody,
      installment_count: countFromBody,
    } = body;

    if (!subscription_id || typeof subscription_id !== 'number') {
      return NextResponse.json(
        { error: 'subscription_id is required' },
        { status: 400 }
      );
    }

    // Validate claim_type
    const validClaimTypes = ['first_sales', 'remarketing', 'upgrade', 'installment'];
    if (!validClaimTypes.includes(claim_type)) {
      return NextResponse.json(
        { error: 'Invalid claim_type' },
        { status: 400 }
      );
    }

    const sellerRecord = await queryOne<{
      seller_id: string;
      display_name: string | null;
    }>(
      `SELECT seller_id, display_name
       FROM wr.sellers
       WHERE seller_id = $1
         AND is_active = TRUE`,
      [user.seller_id]
    );

    if (!sellerRecord) {
      return NextResponse.json(
        { error: 'Seller account not found or inactive' },
        { status: 403 }
      );
    }

    if (
      claimed_by &&
      claimed_by !== sellerRecord.seller_id &&
      claimed_by !== sellerRecord.display_name
    ) {
      return NextResponse.json(
        { error: 'Claimed identity does not match authenticated user' },
        { status: 403 }
      );
    }

    const claimedByValue = sellerRecord.display_name || sellerRecord.seller_id;

    // Execute in transaction
    await transaction(async (client) => {
      // Check if already claimed
      const existing = await client.query(
        'SELECT id FROM wr.claims WHERE subscription_id = $1',
        [subscription_id]
      );

      if (existing.rows.length > 0) {
        throw new Error('Already claimed');
      }

      // Check queue status and get finance info
      const queueItem = await client.query(
        `SELECT status, finance_status, finance_approved_by, finance_approved_at, finance_notes,
                installment_plan_id, installment_count
         FROM wr.queue
         WHERE subscription_id = $1`,
        [subscription_id]
      );

      if (queueItem.rows.length === 0 || queueItem.rows[0].status !== 'pending') {
        throw new Error('Item not available for claim');
      }

      // Transfer finance status from Queue to Claims
      const queueFinance = queueItem.rows[0];
      let effectivePlanId = planIdFromBody || queueFinance.installment_plan_id || null;
      let effectiveInstallmentCount = countFromBody || queueFinance.installment_count || null;

      if (claim_type === 'installment') {
        if (!effectivePlanId) {
          throw new Error('INSTALLMENT_PLAN_REQUIRED');
        }

        const planCheck = await client.query(
          `SELECT id, total_installments
           FROM wr.installments
           WHERE id = $1 AND subscription_id = $2`,
          [effectivePlanId, subscription_id]
        );

        if (planCheck.rows.length === 0) {
          throw new Error('INSTALLMENT_PLAN_INVALID');
        }

        effectiveInstallmentCount =
          effectiveInstallmentCount || planCheck.rows[0].total_installments || null;
      } else {
        // Non-installment claims shouldn't carry plan metadata
        effectivePlanId = null;
        effectiveInstallmentCount = null;
      }

      // Insert claim with finance status from Queue
      const insertedClaim = await client.query(
        `INSERT INTO wr.claims (
           subscription_id,
           claimed_by,
           claim_type,
           attribution_source,
           finance_status,
           finance_approved_by,
           finance_approved_at,
           finance_notes,
           installment_plan_id,
           installment_count
         )
         VALUES ($1, $2, $3, 'claim', $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          subscription_id,
          claimedByValue,
          claim_type,
          queueFinance.finance_status || 'waiting',
          queueFinance.finance_approved_by,
          queueFinance.finance_approved_at,
          queueFinance.finance_notes,
          effectivePlanId,
          effectiveInstallmentCount || null,
        ]
      );

      const newClaimId = insertedClaim.rows[0]?.id as number | undefined;

      if (effectivePlanId && newClaimId) {
        await client.query(
          `UPDATE wr.installments
           SET claim_id = $1
           WHERE id = $2`,
          [newClaimId, effectivePlanId]
        );
      }

      // Update queue status
      await client.query(
        `UPDATE wr.queue
         SET status = 'claimed',
             installment_plan_id = COALESCE($2, installment_plan_id),
             installment_count = COALESCE($3, installment_count)
         WHERE subscription_id = $1`,
        [subscription_id, effectivePlanId, effectiveInstallmentCount || null]
      );

      // Map seller
      const closerSellerId = sellerRecord.seller_id;

      // Upsert attribution - reset shares to 100/0 on re-claim
      await client.query(
        `INSERT INTO wr.attribution (subscription_id, closer_seller_id, resolved_from, closer_share_percent, assisted_share_percent)
         VALUES ($1, $2, 'claim', 1.0, 0.0)
         ON CONFLICT (subscription_id) DO UPDATE
         SET closer_seller_id = EXCLUDED.closer_seller_id,
             resolved_from = EXCLUDED.resolved_from,
             resolved_at = NOW(),
             closer_share_percent = EXCLUDED.closer_share_percent,
             assisted_share_percent = EXCLUDED.assisted_share_percent,
             assisted_seller_id = NULL`,
        [subscription_id, closerSellerId]
      );

      // Update streak
      const streakState = await client.query(
        'SELECT current_claimer, current_count FROM wr.streak_state LIMIT 1'
      );

      const currentStreak = streakState.rows[0];
      let newCount = 1;
      let shouldTriggerStreak = false;

      if (currentStreak.current_claimer === closerSellerId) {
        newCount = currentStreak.current_count + 1;
        if (newCount === 3) {
          shouldTriggerStreak = true;
        }
      }

      await client.query(
        `UPDATE wr.streak_state
         SET current_claimer = $1, current_count = $2, last_claim_at = NOW(), updated_at = NOW()`,
        [closerSellerId, newCount]
      );

      // Create events
      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor, payload)
         VALUES ('claimed', $1, $2, $3)`,
        [subscription_id, closerSellerId, JSON.stringify({ claim_type })]
      );

      if (shouldTriggerStreak) {
        const streakEvent = await client.query(
          `INSERT INTO wr.events (type, actor, payload)
           VALUES ('streak', $1, $2)
           RETURNING id`,
          [closerSellerId, JSON.stringify({ threshold: 3, count: newCount })]
        );

        await insertAchievement({
          client,
          eventId: streakEvent.rows[0]?.id || null,
          type: 'streak',
          sellerId: closerSellerId,
          title: 'Streak',
          description: `${closerSellerId} secured ${newCount} wins in a row.`,
          payload: { count: newCount },
          dedupeKey: streakEvent.rows[0]?.id ? `event:${streakEvent.rows[0].id}` : `streak:${closerSellerId}:${newCount}`,
        });
      }

      // Notify goal progress recalculation
      await client.query(
        `INSERT INTO wr.events (type, actor)
         VALUES ('goal.progress', $1)`,
        [closerSellerId]
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Claim error:', error);

    if (error.message === 'Already claimed') {
      return NextResponse.json(
        { error: 'Already claimed' },
        { status: 409 }
      );
    }

    if (error.message === 'Item not available for claim') {
      return NextResponse.json(
        { error: 'Item not available' },
        { status: 400 }
      );
    }

    if (error.message === 'INSTALLMENT_PLAN_REQUIRED') {
      return NextResponse.json(
        { error: 'Installment plan must be created before claiming as installment' },
        { status: 400 }
      );
    }

    if (error.message === 'INSTALLMENT_PLAN_INVALID') {
      return NextResponse.json(
        { error: 'Installment plan not found for this subscription' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
