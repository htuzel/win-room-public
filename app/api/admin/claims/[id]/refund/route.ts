// Win Room v2.0 - Claim Refund API
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { transaction } from '@/lib/db/connection';

const ALLOWED_ROLES = new Set(['finance', 'admin']);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const claimId = parseInt(params.id, 10);
  if (Number.isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
  }

  let body: {
    refund_type: 'partial' | 'full';
    refund_amount: number;
    refund_reason: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  console.log('[Refund API] Request body:', body);

  const { refund_type, refund_amount, refund_reason } = body;
  const isFullRefund = refund_type === 'full';

  console.log('[Refund API] Parsed values:', {
    refund_type,
    refund_amount,
    refund_amount_type: typeof refund_amount,
    isFullRefund,
  });

  if (!refund_type || !['partial', 'full'].includes(refund_type)) {
    return NextResponse.json({ error: 'Invalid refund_type' }, { status: 400 });
  }

  if (!isFullRefund) {
    if (refund_amount === undefined || refund_amount === null) {
      return NextResponse.json(
        { error: 'refund_amount is required for partial refunds' },
        { status: 400 }
      );
    }
    if (typeof refund_amount !== 'number' || !Number.isFinite(refund_amount) || refund_amount <= 0) {
      return NextResponse.json(
        { error: 'refund_amount must be a valid positive number' },
        { status: 400 }
      );
    }
  }

  if (!refund_reason || typeof refund_reason !== 'string' || !refund_reason.trim()) {
    return NextResponse.json({ error: 'refund_reason is required' }, { status: 400 });
  }
  const reason = refund_reason.trim();

  try {
    const result = await transaction(async (client) => {
      // Get claim details and current metrics
      const claimResult = await client.query(
        `SELECT
           c.id,
           c.subscription_id,
           c.claimed_by,
           c.claim_type,
           c.finance_status,
           sm.revenue_usd,
           sm.cost_usd,
           sm.margin_amount_usd,
           sm.margin_percent
         FROM wr.claims c
         JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
         WHERE c.id = $1`,
        [claimId]
      );

      if (claimResult.rows.length === 0) {
        throw new Error('CLAIM_NOT_FOUND');
      }

      const claim = claimResult.rows[0];
      const currentRevenue = Number(claim.revenue_usd || 0);
      const currentCost = Number(claim.cost_usd || 0);

      if (!Number.isFinite(currentRevenue) || !Number.isFinite(currentCost)) {
        throw new Error('INVALID_METRICS');
      }

      const requestedAmount = isFullRefund ? currentRevenue : Number(refund_amount);

      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error('INVALID_REFUND_AMOUNT');
      }

      if (requestedAmount > currentRevenue) {
        throw new Error('REFUND_EXCEEDS_REVENUE');
      }

      const refundAmount = Number.parseFloat(requestedAmount.toFixed(2));
      const isFull = refundAmount >= Number.parseFloat(currentRevenue.toFixed(2));

      // Calculate new metrics after refund
      const newRevenueRaw = currentRevenue - refundAmount;
      const newRevenue = newRevenueRaw <= 0 ? 0 : Number.parseFloat(newRevenueRaw.toFixed(2));
      const marginBeforeClamp = newRevenue - currentCost;
      const newMarginAmount =
        marginBeforeClamp <= 0 ? 0 : Number.parseFloat(marginBeforeClamp.toFixed(2));
      const newMarginPercent =
        newRevenue > 0 && newMarginAmount > 0 ? newMarginAmount / newRevenue : 0;

      // Update subscription metrics so all derived data reflects the refund
      await client.query(
        `UPDATE wr.subscription_metrics
         SET revenue_usd = $1,
             margin_amount_usd = $2,
             margin_percent = $3,
             computed_at = NOW()
         WHERE subscription_id = $4`,
        [newRevenue, newMarginAmount, newMarginPercent, claim.subscription_id]
      );

      if (isFull) {
        // Mark claim as problematic and note refund
        await client.query(
          `UPDATE wr.claims
           SET finance_status = 'problem',
               finance_notes = CONCAT(
                 COALESCE(finance_notes, ''),
                 '\n[FULL REFUND] ',
                 $1,
                 ' by ',
                 $2,
                 ' at ',
                 NOW()::text
               ),
               updated_at = NOW()
           WHERE id = $3`,
          [reason, user.seller_id, claimId]
        );

        // Track refund so metrics/leaderboards exclude the sale
        await client.query(
          `INSERT INTO wr.refunds (subscription_id, reason, amount_usd, refunded_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (subscription_id) DO UPDATE
           SET reason = EXCLUDED.reason,
               amount_usd = EXCLUDED.amount_usd,
               refunded_at = NOW()`,
          [claim.subscription_id, reason, refundAmount]
        );

        // Reflect status in queue
        await client.query(
          `UPDATE wr.queue
           SET status = 'refunded'
           WHERE subscription_id = $1`,
          [claim.subscription_id]
        );
      } else {
        // Partial refund – remove any stale refund marker so sale still counts
        await client.query(
          `DELETE FROM wr.refunds WHERE subscription_id = $1`,
          [claim.subscription_id]
        );

        await client.query(
          `UPDATE wr.claims
           SET finance_notes = CONCAT(
                 COALESCE(finance_notes, ''),
                 '\n[PARTIAL REFUND: $',
                 $1::text,
                 '] ',
                 $2,
                 ' by ',
                 $3,
                 ' at ',
                 NOW()::text
               ),
               updated_at = NOW()
           WHERE id = $4`,
          [refundAmount.toFixed(2), reason, user.seller_id, claimId]
        );

        // Ensure queue status is claimed (it may have been set to refunded previously)
        await client.query(
          `UPDATE wr.queue
           SET status = 'claimed'
           WHERE subscription_id = $1 AND status = 'refunded'`,
          [claim.subscription_id]
        );
      }

      // Log refund event for downstream listeners (dashboard, sockets, etc.)
      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor, payload)
         VALUES ('refund.applied', $1, $2, $3)`,
        [
          claim.subscription_id,
          user.seller_id,
          JSON.stringify({
            claim_id: claimId,
            refund_type,
            refund_amount: refundAmount,
            refund_reason: reason,
            original_revenue: currentRevenue,
            new_revenue: newRevenue,
            new_margin_amount: newMarginAmount,
            claimed_by: claim.claimed_by,
            full_refund: isFull,
          }),
        ]
      );

      // Refresh materialized view so adjusted metrics stay in sync
      await client.query('REFRESH MATERIALIZED VIEW wr.claim_metrics_adjusted');

      return {
        claim_id: claimId,
        refund_type,
        refund_amount: refundAmount,
        original_revenue: currentRevenue,
        new_revenue: newRevenue,
        new_margin_amount: newMarginAmount,
        full_refund: isFull,
      };
    });

    return NextResponse.json({
      success: true,
      message: `${result.full_refund ? 'Full' : 'Partial'} refund of $${result.refund_amount.toFixed(2)} processed successfully`,
      data: result,
    });
  } catch (error: any) {
    if (error.message === 'CLAIM_NOT_FOUND') {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (error.message === 'REFUND_EXCEEDS_REVENUE') {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed revenue' },
        { status: 400 }
      );
    }

    if (error.message === 'INVALID_METRICS') {
      return NextResponse.json(
        { error: 'Subscription metrics missing for this claim' },
        { status: 400 }
      );
    }

    if (error.message === 'INVALID_REFUND_AMOUNT') {
      return NextResponse.json(
        { error: 'Invalid refund amount provided' },
        { status: 400 }
      );
    }

    console.error('[Refund API] Error processing refund:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
