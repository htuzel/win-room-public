// Win Room v2.0 - GET /api/admin/sellers/:id/performance
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query, queryOne } from '@/lib/db/connection';
import {
  getConversionWindow,
  getPeriodRange,
  getPreviousPeriod,
  normalizePeriod,
  PERIOD_OPTIONS,
} from '@/lib/helpers/periods';
import { getLeadTotalsMap } from '@/lib/helpers/leads';
import type { PeriodKey } from '@/lib/helpers/periods';

interface RouteParams {
  params: {
    id: string;
  };
}

const allowedPeriods = new Set<PeriodKey>(PERIOD_OPTIONS.map((option) => option.value));

type NumericField = string | number | null;

interface SellerRow {
  seller_id: string;
  display_name: string;
  email: string | null;
  role: string | null;
  is_active: boolean;
}

interface MetricsRow {
  wins: NumericField;
  revenue_usd: NumericField;
  margin_amount_usd: NumericField;
  avg_margin_percent: NumericField;
}

interface SaleRow {
  subscription_id: NumericField;
  resolved_at: string;
  queue_created_at: string | null;
  resolved_from: string | null;
  revenue_usd: NumericField;
  margin_amount_usd: NumericField;
  margin_percent: NumericField;
  payment_channel: string | null;
  status: string | null;
  subs_amount: NumericField;
  currency: string | null;
  campaign_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  share_percent?: NumericField;
  share_role?: string | null;
}

const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) {
    if (current === 0) return 0;
    return current > 0 ? 100 : -100;
  }
  return ((current - previous) / previous) * 100;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const sellerId = params.id;
  const period = normalizePeriod(searchParams.get('period') || 'today');
  const requestedLimit = parseInt(searchParams.get('limit') || '50', 10) || 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 200);

  if (!allowedPeriods.has(period)) {
    return NextResponse.json(
      {
        error: `Invalid period. Use one of: ${Array.from(allowedPeriods).join(', ')}`,
      },
      { status: 400 }
    );
  }

  try {
    const seller = await queryOne<SellerRow>(
      `SELECT seller_id, display_name, email, role, is_active
       FROM wr.sellers
       WHERE seller_id = $1`,
      [sellerId]
    );

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentRange = getPeriodRange(period, now);
    const previousPeriod = getPreviousPeriod(period, now);
    const conversionWindow = getConversionWindow(period, now);

    const currentParams: (string | number)[] = [sellerId, currentRange.startDate];
    const currentDateClause = currentRange.endDate
      ? `q.created_at >= $2::date AND q.created_at < ($3::date + interval '1 day')`
      : `q.created_at >= $2::date`;
    if (currentRange.endDate) {
      currentParams.push(currentRange.endDate);
    }

    const currentMetrics = await queryOne<MetricsRow>(
      `SELECT
        COALESCE(SUM(sa.share_percent), 0) as wins,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) as revenue_usd,
        COALESCE(SUM(sm.margin_amount_usd * sa.share_percent), 0) as margin_amount_usd,
        COALESCE(
          SUM(sm.margin_percent * sa.share_percent) / NULLIF(SUM(sa.share_percent), 0),
          0
        ) as avg_margin_percent
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE sa.seller_id = $1
        AND ${currentDateClause}
        AND r.id IS NULL`,
      currentParams
    );

    const previousMetrics = await queryOne<MetricsRow>(
      `SELECT
        COALESCE(SUM(sa.share_percent), 0) as wins,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) as revenue_usd,
        COALESCE(SUM(sm.margin_amount_usd * sa.share_percent), 0) as margin_amount_usd,
        COALESCE(
          SUM(sm.margin_percent * sa.share_percent) / NULLIF(SUM(sa.share_percent), 0),
          0
        ) as avg_margin_percent
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE sa.seller_id = $1
        AND q.created_at >= $2::date
        AND q.created_at <= $3::date
        AND r.id IS NULL`,
      [sellerId, previousPeriod.startDate, previousPeriod.endDate]
    );

    const salesParams: (string | number)[] = [sellerId, currentRange.startDate];
    if (currentRange.endDate) {
      salesParams.push(currentRange.endDate);
    }
    salesParams.push(limit);
    const salesLimitIndex = currentRange.endDate ? 4 : 3;

    const sales = await query<SaleRow>(
      `SELECT
        a.subscription_id,
        a.resolved_at,
        q.created_at AS queue_created_at,
        a.resolved_from,
        sm.revenue_usd * sa.share_percent AS revenue_usd,
        sm.margin_amount_usd * sa.share_percent AS margin_amount_usd,
        sm.margin_percent,
        subs.payment_channel,
        subs.status,
        subs.subs_amount,
        subs.currency,
        c.campaign_name,
        u.name as customer_name,
        u.email as customer_email,
        sa.share_percent,
        sa.role as share_role
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      JOIN subscriptions subs ON subs.id = sa.subscription_id
      LEFT JOIN campaigns c ON c.id = subs.campaign_id
      LEFT JOIN users u ON u.id = subs.user_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE sa.seller_id = $1
        AND ${currentDateClause}
        AND r.id IS NULL
      ORDER BY q.created_at DESC
      LIMIT $${salesLimitIndex}`,
      salesParams
    );

    const current = {
      wins: parseFloat(String(currentMetrics?.wins || '0')),
      revenue_usd: parseFloat(currentMetrics?.revenue_usd || '0'),
      margin_amount_usd: parseFloat(currentMetrics?.margin_amount_usd || '0'),
      avg_margin_percent: parseFloat(currentMetrics?.avg_margin_percent || '0'),
    };

    const previous = {
      wins: parseFloat(String(previousMetrics?.wins || '0')),
      revenue_usd: parseFloat(previousMetrics?.revenue_usd || '0'),
      margin_amount_usd: parseFloat(previousMetrics?.margin_amount_usd || '0'),
      avg_margin_percent: parseFloat(previousMetrics?.avg_margin_percent || '0'),
    };

    const [currentLeadMap, previousLeadMap, conversionWinsCurrentRow, conversionWinsPreviousRow] = await Promise.all([
      getLeadTotalsMap({
        startDate: conversionWindow.current.startDate,
        endDate: conversionWindow.current.endDate,
        sellerIds: [sellerId],
      }),
      getLeadTotalsMap({
        startDate: conversionWindow.previous.startDate,
        endDate: conversionWindow.previous.endDate,
        sellerIds: [sellerId],
      }),
      queryOne<{ wins: string | number }>(
        `SELECT COALESCE(SUM(sa.share_percent), 0) as wins
         FROM wr.attribution_share_entries sa
         JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
         JOIN wr.queue q ON q.subscription_id = sa.subscription_id
         LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
         WHERE sa.seller_id = $1
           AND q.created_at BETWEEN $2::date AND $3::date
           AND r.id IS NULL`,
        [sellerId, conversionWindow.current.startDate, conversionWindow.current.endDate]
      ),
      queryOne<{ wins: string | number }>(
        `SELECT COALESCE(SUM(sa.share_percent), 0) as wins
         FROM wr.attribution_share_entries sa
         JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
         JOIN wr.queue q ON q.subscription_id = sa.subscription_id
         LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
         WHERE sa.seller_id = $1
           AND q.created_at BETWEEN $2::date AND $3::date
           AND r.id IS NULL`,
        [sellerId, conversionWindow.previous.startDate, conversionWindow.previous.endDate]
      ),
    ]);

    const leadsCurrent = currentLeadMap.get(sellerId) || 0;
    const leadsPrevious = previousLeadMap.get(sellerId) || 0;
    const conversionWinsCurrent = parseFloat(String(conversionWinsCurrentRow?.wins || '0'));
    const conversionWinsPrevious = parseFloat(String(conversionWinsPreviousRow?.wins || '0'));

    current.leads_assigned = leadsCurrent;
    current.conversion_rate = leadsCurrent > 0 ? conversionWinsCurrent / leadsCurrent : 0;
    previous.leads_assigned = leadsPrevious;
    previous.conversion_rate = leadsPrevious > 0 ? conversionWinsPrevious / leadsPrevious : 0;

    const change = {
      wins: calculateChange(current.wins, previous.wins),
      revenue_usd: calculateChange(current.revenue_usd, previous.revenue_usd),
      margin_amount_usd: calculateChange(current.margin_amount_usd, previous.margin_amount_usd),
      avg_margin_percent: calculateChange(current.avg_margin_percent, previous.avg_margin_percent),
      leads_assigned: calculateChange(current.leads_assigned || 0, previous.leads_assigned || 0),
      conversion_rate: calculateChange(current.conversion_rate || 0, previous.conversion_rate || 0),
    };

    const salesFormatted = sales.map((sale) => ({
      subscription_id: Number(sale.subscription_id),
      resolved_at: sale.resolved_at,
      queue_created_at: sale.queue_created_at,
      resolved_from: sale.resolved_from,
      campaign_name: sale.campaign_name,
      customer_name: sale.customer_name,
      customer_email: sale.customer_email,
      revenue_usd: sale.revenue_usd != null ? Number(sale.revenue_usd) : null,
      margin_amount_usd: sale.margin_amount_usd != null ? Number(sale.margin_amount_usd) : null,
      margin_percent: sale.margin_percent != null ? Number(sale.margin_percent) : null,
      payment_channel: sale.payment_channel,
      status: sale.status,
      subs_amount: sale.subs_amount != null ? Number(sale.subs_amount) : null,
      currency: sale.currency,
      share_percent: sale.share_percent != null ? Number(sale.share_percent) : null,
      share_role: sale.share_role || null,
    }));

    return NextResponse.json({
      seller: {
        seller_id: seller.seller_id,
        display_name: seller.display_name,
        email: seller.email,
        role: seller.role,
        is_active: seller.is_active,
      },
      metrics: {
        current,
        previous,
        change,
      },
      period: {
        value: period,
        current_start: currentRange.startDate,
        current_end: currentRange.endDate,
        previous_start: previousPeriod.startDate,
        previous_end: previousPeriod.endDate,
      },
      sales: salesFormatted,
    });
  } catch (error) {
    console.error('Seller performance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load seller performance' },
      { status: 500 }
    );
  }
}
