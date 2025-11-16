// Win Room v2.0 - GET /api/admin/metrics/subscription/:id
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/connection';
import { calculateTTS } from '@/lib/helpers/metrics';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin/finance role
  const authResult = await requireRoles(req, ['admin', 'finance']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const subscriptionId = parseInt(params.id);

  if (isNaN(subscriptionId)) {
    return NextResponse.json(
      { error: 'Invalid subscription ID' },
      { status: 400 }
    );
  }

  try {
    // Get comprehensive subscription metrics
    const metrics = await queryOne<any>(`
      SELECT
        s.id as subscription_id,
        s.user_id,
        s.created_at as subscription_created_at,
        s.updated_at as subscription_updated_at,
        s.subs_amount,
        s.currency,
        s.status,
        s.is_free,
        s.payment_channel,
        s.sales_person,
        s.stripe_sub_id,
        s.paypal_sub_id,
        s.custom_note,
        s.subs_note,
        u.created_at as user_created_at,
        u.email as customer_email,
        u.name as customer_name,
        u.is_kid as is_kid_account,
        c.campaign_name,
        c.campaign_lenght,
        c.per_week,
        c.campaign_minute,
        sm.revenue_usd,
        sm.cost_usd,
        sm.margin_amount_usd,
        sm.margin_percent,
        sm.is_jackpot,
        sm.currency_source,
        sm.computed_at as metrics_computed_at,
        q.status as queue_status,
        q.created_at as queue_created_at,
        q.excluded_by,
        q.excluded_at,
        q.exclude_reason,
        q.created_by,
        cl.claimed_by,
        cl.claim_type,
        cl.claimed_at,
        cl.attribution_source,
        a.closer_seller_id,
        a.resolved_from,
        a.resolved_at,
        a.assisted_seller_id,
        r.id as refund_id,
        r.reason as refund_reason,
        r.refunded_at,
        e.reason as exclude_reason_detail,
        e.notes as exclude_notes,
        e.excluded_at as exclusion_timestamp
      FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN campaigns c ON c.id = s.campaign_id
      LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = s.id
      LEFT JOIN wr.queue q ON q.subscription_id = s.id
      LEFT JOIN wr.claims cl ON cl.subscription_id = s.id
      LEFT JOIN wr.attribution a ON a.subscription_id = s.id
      LEFT JOIN wr.refunds r ON r.subscription_id = s.id
      LEFT JOIN wr.exclusions e ON e.subscription_id = s.id
      WHERE s.id = $1
    `, [subscriptionId]);

    if (!metrics) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Calculate TTS
    const tts = metrics.user_created_at && metrics.subscription_created_at
      ? calculateTTS(metrics.user_created_at, metrics.subscription_created_at)
      : null;

    // Format response with all details
    const response = {
      // Basic subscription info
      subscription_id: Number(metrics.subscription_id),
      user_id: Number(metrics.user_id),
      created_at: metrics.subscription_created_at,
      updated_at: metrics.subscription_updated_at,
      status: metrics.status,

      // Customer info
      customer: {
        email: metrics.customer_email,
        name: metrics.customer_name,
        is_kid_account: metrics.is_kid_account,
        created_at: metrics.user_created_at,
        time_to_sale: tts,
      },

      // Campaign info
      campaign: {
        name: metrics.campaign_name,
        length: Number(metrics.campaign_lenght || 0),
        per_week: Number(metrics.per_week || 0),
        minutes: Number(metrics.campaign_minute || 0),
      },

      // Payment info
      payment: {
        amount: metrics.subs_amount ? Number(metrics.subs_amount) : null,
        currency: metrics.currency,
        channel: metrics.payment_channel,
        is_free: metrics.is_free === 1,
        stripe_sub_id: metrics.stripe_sub_id,
        paypal_sub_id: metrics.paypal_sub_id,
      },

      // Financial metrics (admin only)
      metrics: {
        revenue_usd: metrics.revenue_usd ? Number(metrics.revenue_usd) : null,
        cost_usd: metrics.cost_usd ? Number(metrics.cost_usd) : null,
        margin_amount_usd: metrics.margin_amount_usd ? Number(metrics.margin_amount_usd) : null,
        margin_percent: metrics.margin_percent ? Number(metrics.margin_percent) : null,
        is_jackpot: metrics.is_jackpot || false,
        currency_source: metrics.currency_source,
        computed_at: metrics.metrics_computed_at,
      },

      // Queue info
      queue: metrics.queue_status ? {
        status: metrics.queue_status,
        created_at: metrics.queue_created_at,
        excluded_by: metrics.excluded_by,
        excluded_at: metrics.excluded_at,
        exclude_reason: metrics.exclude_reason,
        created_by: metrics.created_by,
      } : null,

      // Claim info
      claim: metrics.claimed_by ? {
        claimed_by: metrics.claimed_by,
        claim_type: metrics.claim_type,
        claimed_at: metrics.claimed_at,
        attribution_source: metrics.attribution_source,
      } : null,

      // Attribution info
      attribution: metrics.closer_seller_id ? {
        closer_seller_id: metrics.closer_seller_id,
        resolved_from: metrics.resolved_from,
        resolved_at: metrics.resolved_at,
        assisted_seller_id: metrics.assisted_seller_id,
      } : null,

      // Refund info
      refund: metrics.refund_id ? {
        reason: metrics.refund_reason,
        refunded_at: metrics.refunded_at,
      } : null,

      // Exclusion info
      exclusion: metrics.exclude_reason_detail ? {
        reason: metrics.exclude_reason_detail,
        notes: metrics.exclude_notes,
        excluded_at: metrics.exclusion_timestamp,
      } : null,

      // Notes
      notes: {
        custom_note: metrics.custom_note,
        subs_note: metrics.subs_note,
        sales_person: metrics.sales_person,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Subscription metrics fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
