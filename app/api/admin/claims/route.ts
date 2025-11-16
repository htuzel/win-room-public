// Win Room v2.0 - Admin Claims Management API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

interface ClaimRow {
  id: number;
  subscription_id: number;
  claimed_by: string;
  claim_type: string;
  claimed_at: string;
  attribution_source: string | null;
  queue_created_by: string | null;
  queue_is_manual: boolean;
  queue_created_by_email: string | null;
  claimer_name: string | null;
  claimer_email: string | null;
  closer_seller_id: string | null;
  assisted_seller_id: string | null;
  resolved_from: string | null;
  resolved_at: string | null;
  closer_share_percent: string | number | null;
  assisted_share_percent: string | number | null;
  closer_name: string | null;
  assisted_name: string | null;
  customer_email: string | null;
  customer_name: string | null;
  payment_channel: string | null;
  subs_amount: string | number | null;
  currency: string | null;
  subscription_created_at: string | null;
  cost_usd?: string | number | null;
  finance_status: string | null;
  finance_approved_by: string | null;
  finance_approved_at: string | null;
  finance_notes: string | null;
  installment_plan_id: number | null;
  installment_count: number | null;
  margin_percent: string | number | null;
  revenue_usd: string | number | null;
  original_margin_usd: string | number | null;
  adjusted_margin_usd: string | number | null;
  adjusted_margin_percent: string | number | null;
  total_additional_cost_usd: string | number | null;
  adjustment_count: number | null;
  adjustment_reasons: string | null;
  last_adjusted_at: string | null;
}

export async function GET(req: NextRequest) {
  // Require admin, finance, or sales team lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';

  try {
    // Get total count with same search filter
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
      FROM wr.claims c
      LEFT JOIN wr.sellers s ON s.seller_id = c.claimed_by
      LEFT JOIN subscriptions subs ON subs.id = c.subscription_id
      LEFT JOIN users u ON u.id = subs.user_id
      WHERE ($1::text = '' OR
        CAST(c.subscription_id AS TEXT) LIKE $1 OR
        u.email ILIKE $1 OR
        u.name ILIKE $1 OR
        s.display_name ILIKE $1)`,
      [`%${search}%`]
    );
    const totalCount = parseInt(countResult[0]?.count || '0');

    // Get paginated claims
    const rawClaims = await query<ClaimRow>(
      `SELECT
        c.id,
        c.subscription_id,
        c.claimed_by,
        c.claim_type,
        c.claimed_at,
        c.attribution_source,
        q.created_by AS queue_created_by,
        (q.created_by IS NOT NULL) AS queue_is_manual,
        queue_creator.email AS queue_created_by_email,
        s.display_name as claimer_name,
        s.email as claimer_email,
        a.closer_seller_id,
        a.assisted_seller_id,
        a.resolved_from,
        a.resolved_at,
        a.closer_share_percent,
        a.assisted_share_percent,
        closer.display_name as closer_name,
        assisted.display_name as assisted_name,
        u.email as customer_email,
        u.name as customer_name,
        subs.payment_channel,
        subs.subs_amount,
        subs.currency,
        subs.created_at as subscription_created_at,
        -- Finance approval status
        c.finance_status,
        c.finance_approved_by,
        c.finance_approved_at,
        c.finance_notes,
        c.installment_plan_id,
        c.installment_count,
        -- Use adjusted metrics from materialized view
        COALESCE(cma.original_margin_percent, sm.margin_percent) as margin_percent,
        COALESCE(cma.revenue_usd, sm.revenue_usd) as revenue_usd,
        COALESCE(cma.original_margin_usd, sm.margin_amount_usd) as original_margin_usd,
        cma.adjusted_margin_usd,
        cma.adjusted_margin_percent,
        cma.total_additional_cost_usd,
        cma.adjustment_count,
        cma.adjustment_reasons,
        cma.last_adjusted_at
      FROM wr.claims c
      LEFT JOIN wr.sellers s ON s.seller_id = c.claimed_by
      LEFT JOIN wr.queue q ON q.subscription_id = c.subscription_id
      LEFT JOIN wr.attribution a ON a.subscription_id = c.subscription_id
      LEFT JOIN wr.sellers closer ON closer.seller_id = a.closer_seller_id
      LEFT JOIN wr.sellers assisted ON assisted.seller_id = a.assisted_seller_id
      LEFT JOIN subscriptions subs ON subs.id = c.subscription_id
      LEFT JOIN users u ON u.id = subs.user_id
      LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
      LEFT JOIN wr.claim_metrics_adjusted cma ON cma.claim_id = c.id
      LEFT JOIN wr.sellers queue_creator ON queue_creator.seller_id = q.created_by
      WHERE ($1::text = '' OR
        CAST(c.subscription_id AS TEXT) LIKE $1 OR
        u.email ILIKE $1 OR
        u.name ILIKE $1 OR
        s.display_name ILIKE $1)
      ORDER BY c.claimed_at DESC
      LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const toNumber = (value: unknown) =>
      value === null || value === undefined ? null : Number(value);

    const claims = rawClaims.map((claim) => ({
      ...claim,
      revenue_usd: toNumber(claim.revenue_usd),
      cost_usd: toNumber(claim.cost_usd),
      margin_percent: claim.margin_percent !== null && claim.margin_percent !== undefined ? Number(claim.margin_percent) : null,
      original_margin_usd: toNumber(claim.original_margin_usd),
      adjusted_margin_usd: toNumber(claim.adjusted_margin_usd),
      adjusted_margin_percent: claim.adjusted_margin_percent !== null && claim.adjusted_margin_percent !== undefined ? Number(claim.adjusted_margin_percent) : null,
      total_additional_cost_usd: toNumber(claim.total_additional_cost_usd),
      closer_share_percent: claim.closer_share_percent !== null && claim.closer_share_percent !== undefined ? Number(claim.closer_share_percent) : 1,
      assisted_share_percent: claim.assisted_share_percent !== null && claim.assisted_share_percent !== undefined ? Number(claim.assisted_share_percent) : 0,
      subs_amount: toNumber(claim.subs_amount),
    }));

    return NextResponse.json({
      claims,
      pagination: {
        limit,
        offset,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1,
      }
    });
  } catch (error) {
    console.error('Claims fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
