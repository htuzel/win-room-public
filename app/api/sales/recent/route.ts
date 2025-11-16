// Win Room v2.0 - Recent Sales API (Last 72 hours)
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { calculateTTS } from '@/lib/helpers/metrics';

interface RecentSaleRow {
  id: number;
  subscription_id: number;
  claimed_by: string;
  claim_type: string;
  claimed_at: string;
  queue_is_manual: boolean;
  queue_created_by?: string | null;
  queue_created_by_email?: string | null;
  customer_name?: string;
  customer_email?: string;
  campaign_name?: string;
  revenue_usd?: number;
  margin_amount_usd?: number;
  margin_percent?: number;
  payment_channel?: string;
  sales_person?: string;
  subscription_created_at?: string;
  user_created_at?: string;
  has_objection: boolean;
  objection_status?: string;
  closer_seller_id?: string | null;
  share_percent?: number | null;
  share_role?: 'closer' | 'assisted' | null;
}

interface RecentSale extends Omit<RecentSaleRow, 'user_created_at'> {
  tts?: string;
}

export async function GET(req: NextRequest) {
  // Authenticate - all logged-in users can see recent sales
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const { searchParams } = new URL(req.url);
  const emailFilter = searchParams.get('email') || '';
  const mySalesOnly = searchParams.get('my_sales_only') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  try {
    let totalCount = 0;
    let rows: RecentSaleRow[] = [];
    let totalShare = 0;

    if (mySalesOnly) {
      const conditions: string[] = ['r.id IS NULL', 'sa.seller_id = $1'];
      const params: any[] = [user.seller_id];

      if (emailFilter) {
        params.push(`%${emailFilter}%`);
        conditions.push(
          `(LOWER(u.email) LIKE LOWER($${params.length}) OR LOWER(u.name) LIKE LOWER($${params.length}))`
        );
      }

      const whereConditions = `WHERE ${conditions.join(' AND ')}`;

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM wr.claims c
         JOIN subscriptions subs ON subs.id = c.subscription_id
         JOIN wr.attribution_share_entries sa ON sa.subscription_id = c.subscription_id
         JOIN wr.attribution a ON a.subscription_id = c.subscription_id
         LEFT JOIN users u ON u.id = subs.user_id
         LEFT JOIN wr.refunds r ON r.subscription_id = c.subscription_id
         ${whereConditions}`,
        params
      );
      totalCount = parseInt(countResult[0]?.count || '0', 10);

      const shareResult = await query<{ total_share: string }>(
        `SELECT COALESCE(SUM(sa.share_percent), 0) as total_share
         FROM wr.claims c
         JOIN subscriptions subs ON subs.id = c.subscription_id
         JOIN wr.attribution_share_entries sa ON sa.subscription_id = c.subscription_id
         JOIN wr.attribution a ON a.subscription_id = c.subscription_id
         LEFT JOIN users u ON u.id = subs.user_id
         LEFT JOIN wr.refunds r ON r.subscription_id = c.subscription_id
         ${whereConditions}`,
        params
      );
      totalShare = parseFloat(shareResult[0]?.total_share || '0');

      params.push(limit);
      const limitParam = params.length;
      params.push(offset);
      const offsetParam = params.length;

      rows = await query<RecentSaleRow>(
        `SELECT
          c.id,
          c.subscription_id,
          c.claimed_by,
          c.claim_type,
          c.claimed_at,
          (q.created_by IS NOT NULL) AS queue_is_manual,
          q.created_by AS queue_created_by,
          queue_creator.email AS queue_created_by_email,
          u.name as customer_name,
          u.email as customer_email,
          u.created_at as user_created_at,
          camp.campaign_name,
          sm.revenue_usd * sa.share_percent as revenue_usd,
          COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent as margin_amount_usd,
          COALESCE(cma.adjusted_margin_percent, sm.margin_percent) as margin_percent,
          subs.payment_channel,
          subs.sales_person,
          subs.created_at as subscription_created_at,
          a.closer_seller_id,
          sa.share_percent,
          sa.role as share_role,
          EXISTS(
            SELECT 1 FROM wr.objections o
            WHERE o.subscription_id = c.subscription_id
            AND o.raised_by != c.claimed_by
          ) as has_objection,
          (
            SELECT o.status FROM wr.objections o
            WHERE o.subscription_id = c.subscription_id
            AND o.raised_by != c.claimed_by
            ORDER BY o.created_at DESC
            LIMIT 1
          ) as objection_status
        FROM wr.claims c
        JOIN subscriptions subs ON subs.id = c.subscription_id
        JOIN wr.attribution_share_entries sa ON sa.subscription_id = c.subscription_id
        JOIN wr.attribution a ON a.subscription_id = c.subscription_id
        LEFT JOIN users u ON u.id = subs.user_id
        LEFT JOIN campaigns camp ON camp.id = subs.campaign_id
        LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
        LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = c.subscription_id
        LEFT JOIN wr.queue q ON q.subscription_id = c.subscription_id
        LEFT JOIN wr.sellers queue_creator ON queue_creator.seller_id = q.created_by
        LEFT JOIN wr.refunds r ON r.subscription_id = c.subscription_id
        ${whereConditions}
        ORDER BY c.claimed_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      );
    } else {
      const conditions: string[] = ['r.id IS NULL', `c.claimed_at >= NOW() - INTERVAL '120 hours'`];
      const params: any[] = [];

      if (emailFilter) {
        params.push(`%${emailFilter}%`);
        conditions.push(
          `(LOWER(u.email) LIKE LOWER($${params.length}) OR LOWER(u.name) LIKE LOWER($${params.length}))`
        );
      }

      const whereConditions = `WHERE ${conditions.join(' AND ')}`;

      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM wr.claims c
         JOIN subscriptions subs ON subs.id = c.subscription_id
         LEFT JOIN wr.attribution a ON a.subscription_id = c.subscription_id
         LEFT JOIN users u ON u.id = subs.user_id
         LEFT JOIN wr.refunds r ON r.subscription_id = c.subscription_id
         ${whereConditions}`,
        params
      );
      totalCount = parseInt(countResult[0]?.count || '0', 10);

      params.push(limit);
      const limitParam = params.length;
      params.push(offset);
      const offsetParam = params.length;

      rows = await query<RecentSaleRow>(
        `SELECT
          c.id,
          c.subscription_id,
          c.claimed_by,
          c.claim_type,
          c.claimed_at,
          (q.created_by IS NOT NULL) AS queue_is_manual,
          q.created_by AS queue_created_by,
          queue_creator.email AS queue_created_by_email,
          u.name as customer_name,
          u.email as customer_email,
          u.created_at as user_created_at,
          camp.campaign_name,
          sm.revenue_usd,
          COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) as margin_amount_usd,
          COALESCE(cma.adjusted_margin_percent, sm.margin_percent) as margin_percent,
          subs.payment_channel,
          subs.sales_person,
          subs.created_at as subscription_created_at,
          a.closer_seller_id,
          NULL::numeric as share_percent,
          NULL::text as share_role,
          EXISTS(
            SELECT 1 FROM wr.objections o
            WHERE o.subscription_id = c.subscription_id
            AND o.raised_by != c.claimed_by
          ) as has_objection,
          (
            SELECT o.status FROM wr.objections o
            WHERE o.subscription_id = c.subscription_id
            AND o.raised_by != c.claimed_by
            ORDER BY o.created_at DESC
            LIMIT 1
          ) as objection_status
        FROM wr.claims c
        JOIN subscriptions subs ON subs.id = c.subscription_id
        LEFT JOIN users u ON u.id = subs.user_id
        LEFT JOIN campaigns camp ON camp.id = subs.campaign_id
        LEFT JOIN wr.attribution a ON a.subscription_id = c.subscription_id
        LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
        LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = c.subscription_id
        LEFT JOIN wr.queue q ON q.subscription_id = c.subscription_id
        LEFT JOIN wr.sellers queue_creator ON queue_creator.seller_id = q.created_by
        LEFT JOIN wr.refunds r ON r.subscription_id = c.subscription_id
        ${whereConditions}
        ORDER BY c.claimed_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      );
    }

    const sales: RecentSale[] = rows.map((row) => {
      const tts = row.user_created_at && row.subscription_created_at
        ? calculateTTS(row.user_created_at, row.subscription_created_at)
        : undefined;

      const { user_created_at, ...sale } = row;
      return {
        ...sale,
        revenue_usd: sale.revenue_usd != null ? Number(sale.revenue_usd) : undefined,
        margin_amount_usd: sale.margin_amount_usd != null ? Number(sale.margin_amount_usd) : undefined,
        share_percent: sale.share_percent != null ? Number(sale.share_percent) : undefined,
        tts,
      };
    });

    if (mySalesOnly) {
      const totalPages = Math.ceil(totalCount / limit);
      return NextResponse.json({
        sales,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          totalShare,
        },
      });
    }

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Recent sales fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
