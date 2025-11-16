// Win Room v2.0 - Admin Manual Claim API
import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db/connection';
import { insertAchievement } from '@/lib/db/achievements';
import { requireRoles } from '@/lib/auth/middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST - Manually claim a queue item to a specific seller
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const queueId = parseInt(params.id);
  if (isNaN(queueId)) {
    return NextResponse.json({ error: 'Invalid queue ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { seller_id, claim_type } = body;

    if (!seller_id || !claim_type) {
      return NextResponse.json(
        { error: 'seller_id and claim_type are required' },
        { status: 400 }
      );
    }

    const validClaimTypes = ['first_sales', 'remarketing', 'upgrade', 'installment'];
    if (!validClaimTypes.includes(claim_type)) {
      return NextResponse.json(
        { error: `Invalid claim_type. Must be one of: ${validClaimTypes.join(', ')}` },
        { status: 400 }
      );
    }

    await transaction(async (client) => {
      const queueResult = await client.query<{
        subscription_id: number;
        status: string;
        finance_status: string | null;
        finance_approved_by: string | null;
        finance_approved_at: string | null;
        finance_notes: string | null;
        installment_plan_id: number | null;
        installment_count: number | null;
      }>(
        `SELECT
           subscription_id,
           status,
           finance_status,
           finance_approved_by,
           finance_approved_at,
           finance_notes,
           installment_plan_id,
           installment_count
         FROM wr.queue
         WHERE id = $1
         FOR UPDATE`,
        [queueId]
      );

      if (queueResult.rows.length === 0) {
        throw new Error('QUEUE_NOT_FOUND');
      }

      const queueItem = queueResult.rows[0];
      if (queueItem.status !== 'pending') {
        throw new Error('QUEUE_NOT_PENDING');
      }

      const sellerCheck = await client.query(
        `SELECT seller_id
         FROM wr.sellers
         WHERE seller_id = $1
           AND is_active = TRUE`,
        [seller_id]
      );

      if (sellerCheck.rows.length === 0) {
        throw new Error('SELLER_NOT_FOUND');
      }

      const subscriptionId = queueItem.subscription_id;

      const claimResult = await client.query<{ id: number }>(
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
           installment_count,
           claimed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (subscription_id) DO UPDATE
         SET claimed_by = $2,
             claim_type = $3,
             attribution_source = $4,
             finance_status = $5,
             finance_approved_by = $6,
             finance_approved_at = $7,
             finance_notes = $8,
             installment_plan_id = $9,
             installment_count = $10,
             claimed_at = NOW()
         RETURNING id`,
        [
          subscriptionId,
          seller_id,
          claim_type,
          'admin_manual',
          queueItem.finance_status || 'waiting',
          queueItem.finance_approved_by,
          queueItem.finance_approved_at,
          queueItem.finance_notes,
          queueItem.installment_plan_id,
          queueItem.installment_count,
        ]
      );

      const newClaimId = claimResult.rows[0]?.id ?? null;

      if (queueItem.installment_plan_id && newClaimId) {
        await client.query(
          `UPDATE wr.installments
           SET claim_id = $1
           WHERE id = $2`,
          [newClaimId, queueItem.installment_plan_id]
        );
      }

      await client.query(
        `UPDATE wr.queue
         SET status = 'claimed'
         WHERE subscription_id = $1`,
        [subscriptionId]
      );

      await client.query(
        `INSERT INTO wr.attribution (subscription_id, closer_seller_id, resolved_from, resolved_at, closer_share_percent, assisted_share_percent)
         VALUES ($1, $2, 'admin_manual', NOW(), 1.0, 0.0)
         ON CONFLICT (subscription_id) DO UPDATE
         SET closer_seller_id = EXCLUDED.closer_seller_id,
             resolved_from = EXCLUDED.resolved_from,
             resolved_at = NOW()`,
        [subscriptionId, seller_id]
      );

      const streakState = await client.query<{ current_claimer: string | null; current_count: number }>(
        `SELECT current_claimer, current_count
         FROM wr.streak_state
         LIMIT 1`
      );

      let newCount = 1;
      let shouldTriggerStreak = false;
      const currentStreak = streakState.rows[0];

      if (currentStreak?.current_claimer === seller_id) {
        newCount = (currentStreak.current_count || 0) + 1;
        if (newCount === 3) {
          shouldTriggerStreak = true;
        }
      }

      await client.query(
        `UPDATE wr.streak_state
         SET current_claimer = $1,
             current_count = $2,
             last_claim_at = NOW(),
             updated_at = NOW()`,
        [seller_id, newCount]
      );

      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor, payload)
         VALUES ('claimed', $1, $2, $3)`,
        [
          subscriptionId,
          seller_id,
          JSON.stringify({
            claim_type,
            admin_manual: true,
          }),
        ]
      );

      if (shouldTriggerStreak) {
        const streakEvent = await client.query<{ id: number }>(
          `INSERT INTO wr.events (type, actor, payload)
           VALUES ('streak', $1, $2)
           RETURNING id`,
          [seller_id, JSON.stringify({ threshold: 3, count: newCount })]
        );

        await insertAchievement({
          client,
          eventId: streakEvent.rows[0]?.id || null,
          type: 'streak',
          sellerId: seller_id,
          title: 'Streak',
          description: `${seller_id} secured ${newCount} wins in a row.`,
          payload: { count: newCount },
          dedupeKey: streakEvent.rows[0]?.id
            ? `event:${streakEvent.rows[0].id}`
            : `streak:${seller_id}:${newCount}`,
        });
      }

      await client.query(
        `INSERT INTO wr.events (type, actor)
         VALUES ('goal.progress', $1)`,
        [seller_id]
      );
    });

    return NextResponse.json({
      success: true,
      message: `Queue item #${queueId} claimed by ${seller_id}`,
    });
  } catch (error: any) {
    console.error('Admin manual claim error:', error);

    if (error instanceof Error) {
      if (error.message === 'QUEUE_NOT_FOUND') {
        return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
      }
      if (error.message === 'QUEUE_NOT_PENDING') {
        return NextResponse.json({ error: 'Queue item is not pending' }, { status: 400 });
      }
      if (error.message === 'SELLER_NOT_FOUND') {
        return NextResponse.json({ error: 'Seller not found or inactive' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to claim queue item' },
      { status: 500 }
    );
  }
}
