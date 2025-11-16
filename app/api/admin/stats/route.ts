// Win Room v2.0 - Admin Statistics API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/connection';
import {
  getPeriodRange,
  getPreviousPeriod,
  getConversionWindow,
  normalizePeriod,
} from '@/lib/helpers/periods';
import { getLeadSum } from '@/lib/helpers/leads';

interface AdminStatsRow {
  total_sales: string | number | null;
  total_revenue_usd: string | number | null;
  total_margin_usd: string | number | null;
  original_margin_usd?: string | number | null;
  total_adjustments_usd?: string | number | null;
  avg_margin_percent: string | number | null;
}

export async function GET(req: NextRequest) {
  // Require admin/finance role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const sellerIds = searchParams.get('seller_ids')?.split(',').filter(Boolean) || [];
  const period = normalizePeriod(searchParams.get('period') || 'today');

  try {
    // Determine date range
    const { startDate, endDate } = getPeriodRange(period);

    // Build WHERE clause for seller filter
    const currentParams: (string | string[])[] = [startDate];
    if (endDate) {
      currentParams.push(endDate);
    }
    const sellerParamIndexCurrent = sellerIds.length > 0 ? currentParams.length + 1 : null;
    if (sellerIds.length > 0) {
      currentParams.push(sellerIds);
    }

    const dateClause = endDate
      ? `q.created_at >= $1::date AND q.created_at < ($2::date + interval '1 day')`
      : `q.created_at >= $1::date`;
    const sellerFilterCurrent = sellerParamIndexCurrent
      ? `AND sa.seller_id = ANY($${sellerParamIndexCurrent}::text[])`
      : '';

    const stats = await queryOne<AdminStatsRow>(
      `SELECT
        COALESCE(SUM(sa.share_percent), 0) as total_sales,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) as total_revenue_usd,
        COALESCE(SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent), 0) as total_margin_usd,
        COALESCE(SUM(sm.margin_amount_usd * sa.share_percent), 0) as original_margin_usd,
        COALESCE(SUM(COALESCE(cma.total_additional_cost_usd, 0) * sa.share_percent), 0) as total_adjustments_usd,
        COALESCE(
          SUM(COALESCE(cma.adjusted_margin_percent, sm.margin_percent) * sa.share_percent)
          / NULLIF(SUM(sa.share_percent), 0),
          0
        ) as avg_margin_percent
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE ${dateClause}
        AND r.id IS NULL
        ${sellerFilterCurrent}`,
      currentParams
    );

    const previousPeriod = getPreviousPeriod(period);
    const previousParams: (string | string[])[] = [previousPeriod.startDate, previousPeriod.endDate];
    const sellerParamIndexPrevious = sellerIds.length > 0 ? previousParams.length + 1 : null;
    if (sellerIds.length > 0) {
      previousParams.push(sellerIds);
    }
    const sellerFilterPrevious = sellerParamIndexPrevious
      ? `AND sa.seller_id = ANY($${sellerParamIndexPrevious}::text[])`
      : '';

    const previousStats = await queryOne<AdminStatsRow>(
      `SELECT
        COALESCE(SUM(sa.share_percent), 0) as total_sales,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) as total_revenue_usd,
        COALESCE(SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent), 0) as total_margin_usd,
        COALESCE(
          SUM(COALESCE(cma.adjusted_margin_percent, sm.margin_percent) * sa.share_percent)
          / NULLIF(SUM(sa.share_percent), 0),
          0
        ) as avg_margin_percent
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE q.created_at >= $1::date
        AND q.created_at < ($2::date + interval '1 day')
        AND r.id IS NULL
        ${sellerFilterPrevious}`,
      previousParams
    );

    const conversionWindow = getConversionWindow(period);
    const winsSellerFilter = sellerIds.length > 0 ? 'AND sa.seller_id = ANY($3::text[])' : '';

    let totalLeads: number | null = null;
    let previousLeads: number | null = null;
    let conversionWinsCurrent = 0;
    let conversionWinsPrevious = 0;

    try {
      const [leadsCurrent, leadsPrevious, winsCurrentRow, winsPreviousRow] = await Promise.all([
        getLeadSum({
          startDate: conversionWindow.current.startDate,
          endDate: conversionWindow.current.endDate,
          sellerIds: sellerIds.length > 0 ? sellerIds : undefined,
        }),
        getLeadSum({
          startDate: conversionWindow.previous.startDate,
          endDate: conversionWindow.previous.endDate,
          sellerIds: sellerIds.length > 0 ? sellerIds : undefined,
        }),
        queryOne<{ wins: string | number }>(
          `SELECT COALESCE(SUM(sa.share_percent), 0) as wins
           FROM wr.attribution_share_entries sa
           JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
           JOIN wr.queue q ON q.subscription_id = sa.subscription_id
           LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
           WHERE q.created_at >= $1::date
             AND q.created_at < ($2::date + interval '1 day')
             AND r.id IS NULL
             ${winsSellerFilter}`,
          sellerIds.length > 0
            ? [conversionWindow.current.startDate, conversionWindow.current.endDate, sellerIds]
            : [conversionWindow.current.startDate, conversionWindow.current.endDate]
        ),
        queryOne<{ wins: string | number }>(
          `SELECT COALESCE(SUM(sa.share_percent), 0) as wins
           FROM wr.attribution_share_entries sa
           JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
           JOIN wr.queue q ON q.subscription_id = sa.subscription_id
           LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
           WHERE q.created_at >= $1::date
             AND q.created_at < ($2::date + interval '1 day')
             AND r.id IS NULL
             ${winsSellerFilter}`,
          sellerIds.length > 0
            ? [conversionWindow.previous.startDate, conversionWindow.previous.endDate, sellerIds]
            : [conversionWindow.previous.startDate, conversionWindow.previous.endDate]
        ),
      ]);

      totalLeads = leadsCurrent;
      previousLeads = leadsPrevious;
      conversionWinsCurrent = parseFloat(String(winsCurrentRow?.wins || '0'));
      conversionWinsPrevious = parseFloat(String(winsPreviousRow?.wins || '0'));
    } catch (leadError) {
      console.error('Lead stats fetch error (non-fatal):', leadError);
    }

    // Format response
    const response = {
      total_sales: parseFloat(String(stats?.total_sales || '0')),
      total_revenue_usd: parseFloat(stats?.total_revenue_usd || '0'),
      total_margin_usd: parseFloat(stats?.total_margin_usd || '0'),
      original_margin_usd: parseFloat(stats?.original_margin_usd || '0'),
      total_adjustments_usd: parseFloat(stats?.total_adjustments_usd || '0'),
      avg_margin_percent: parseFloat(stats?.avg_margin_percent || '0'),
      total_leads: totalLeads,
      conversion_rate:
        totalLeads && totalLeads > 0 ? conversionWinsCurrent / totalLeads : null,
      previous: {
        total_sales: parseFloat(String(previousStats?.total_sales || '0')),
        total_revenue_usd: parseFloat(previousStats?.total_revenue_usd || '0'),
        total_margin_usd: parseFloat(previousStats?.total_margin_usd || '0'),
        avg_margin_percent: parseFloat(previousStats?.avg_margin_percent || '0'),
        total_leads: previousLeads,
        conversion_rate:
          previousLeads && previousLeads > 0
            ? conversionWinsPrevious / previousLeads
            : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin stats fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
