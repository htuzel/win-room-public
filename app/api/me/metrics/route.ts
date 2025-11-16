// Win Room v2.0 - GET /api/me/metrics
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/connection';
import { getPeriodRange, getPreviousPeriod, getConversionWindow, normalizePeriod } from '@/lib/helpers/periods';
import { getLeadTotalsMap } from '@/lib/helpers/leads';

interface SellerMetricsRow {
  wins: string | number | null;
  revenue_usd: string | number | null;
  margin_amount_usd: string | number | null;
  avg_margin_percent: string | number | null;
  original_margin_amount_usd?: string | number | null;
  total_adjustments_usd?: string | number | null;
}

export async function GET(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const { searchParams } = new URL(req.url);
  const period = normalizePeriod(searchParams.get('period') || 'today');

  try {
    // Determine date range using helper function
    const { startDate, endDate } = getPeriodRange(period);
    const { current: conversionWindow, previous: previousConversionWindow } = getConversionWindow(period);

    // Get user metrics - ONLY for authenticated user (using adjusted margins)
    const metrics = await queryOne<SellerMetricsRow>(
      `
      SELECT
        COALESCE(SUM(sa.share_percent), 0) AS wins,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) AS revenue_usd,
        COALESCE(SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent), 0) AS margin_amount_usd,
        COALESCE(
          SUM(COALESCE(cma.adjusted_margin_percent, sm.margin_percent) * sa.share_percent)
          / NULLIF(SUM(sa.share_percent), 0),
          0
        ) AS avg_margin_percent,
        COALESCE(SUM(sm.margin_amount_usd * sa.share_percent), 0) AS original_margin_amount_usd,
        COALESCE(SUM(COALESCE(cma.total_additional_cost_usd, 0) * sa.share_percent), 0) AS total_adjustments_usd
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE sa.seller_id = $1
        AND q.created_at >= $2::date
        ${endDate ? "AND q.created_at < ($3::date + interval '1 day')" : ''}
        AND r.id IS NULL
    `,
      endDate ? [user.seller_id, startDate, endDate] : [user.seller_id, startDate]
    );

    // Get previous period metrics for comparison (using adjusted margins)
    const previousPeriod = getPreviousPeriod(period);
    const previousMetrics = await queryOne<SellerMetricsRow>(
      `
      SELECT
        COALESCE(SUM(sa.share_percent), 0) AS wins,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) AS revenue_usd,
        COALESCE(SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent), 0) AS margin_amount_usd,
        COALESCE(
          SUM(COALESCE(cma.adjusted_margin_percent, sm.margin_percent) * sa.share_percent)
          / NULLIF(SUM(sa.share_percent), 0),
          0
        ) AS avg_margin_percent
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE sa.seller_id = $1
        AND q.created_at >= $2::date
        AND q.created_at < ($3::date + interval '1 day')
        AND r.id IS NULL
    `,
      [user.seller_id, previousPeriod.startDate, previousPeriod.endDate]
    );

    const [conversionCurrentWinsRow, conversionPreviousWinsRow, leadTotals, previousLeadTotals] = await Promise.all([
      queryOne<{ wins: string | number }>(
        `SELECT COALESCE(SUM(sa.share_percent), 0) as wins
         FROM wr.attribution_share_entries sa
         JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
         JOIN wr.queue q ON q.subscription_id = sa.subscription_id
         LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
         WHERE sa.seller_id = $1
           AND q.created_at >= $2::date
           AND q.created_at < ($3::date + interval '1 day')
           AND r.id IS NULL`,
        [user.seller_id, conversionWindow.startDate, conversionWindow.endDate]
      ),
      queryOne<{ wins: string | number }>(
        `SELECT COALESCE(SUM(sa.share_percent), 0) as wins
         FROM wr.attribution_share_entries sa
         JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
         JOIN wr.queue q ON q.subscription_id = sa.subscription_id
         LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
         WHERE sa.seller_id = $1
           AND q.created_at >= $2::date
           AND q.created_at < ($3::date + interval '1 day')
           AND r.id IS NULL`,
        [user.seller_id, previousConversionWindow.startDate, previousConversionWindow.endDate]
      ),
      getLeadTotalsMap({
        startDate: conversionWindow.startDate,
        endDate: conversionWindow.endDate,
        sellerIds: [user.seller_id],
      }),
      getLeadTotalsMap({
        startDate: previousConversionWindow.startDate,
        endDate: previousConversionWindow.endDate,
        sellerIds: [user.seller_id],
      }),
    ]);

    const leadsAssigned = leadTotals.get(user.seller_id) || 0;
    const prevLeadsAssigned = previousLeadTotals.get(user.seller_id) || 0;
    const conversionWinsCurrent = parseFloat(String(conversionCurrentWinsRow?.wins || '0'));
    const conversionWinsPrevious = parseFloat(String(conversionPreviousWinsRow?.wins || '0'));

    // Calculate current metrics
    const current = {
      wins: parseFloat(metrics?.wins || '0'),
      revenue_usd: parseFloat(metrics?.revenue_usd || '0'),
      margin_amount_usd: parseFloat(metrics?.margin_amount_usd || '0'),
      avg_margin_percent: parseFloat(metrics?.avg_margin_percent || '0'),
      original_margin_amount_usd: parseFloat(metrics?.original_margin_amount_usd || '0'),
      total_adjustments_usd: parseFloat(metrics?.total_adjustments_usd || '0'),
      leads_assigned: leadsAssigned,
      conversion_rate: leadsAssigned > 0 ? conversionWinsCurrent / leadsAssigned : 0,
    };

    // Calculate previous metrics
    const previous = {
      wins: parseFloat(previousMetrics?.wins || '0'),
      revenue_usd: parseFloat(previousMetrics?.revenue_usd || '0'),
      margin_amount_usd: parseFloat(previousMetrics?.margin_amount_usd || '0'),
      avg_margin_percent: parseFloat(previousMetrics?.avg_margin_percent || '0'),
      leads_assigned: prevLeadsAssigned,
      conversion_rate: prevLeadsAssigned > 0 ? conversionWinsPrevious / prevLeadsAssigned : 0,
    };

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const change = {
      wins: calculateChange(current.wins, previous.wins),
      revenue_usd: calculateChange(current.revenue_usd, previous.revenue_usd),
      margin_amount_usd: calculateChange(current.margin_amount_usd, previous.margin_amount_usd),
      avg_margin_percent: calculateChange(current.avg_margin_percent, previous.avg_margin_percent),
      leads_assigned: calculateChange(current.leads_assigned || 0, previous.leads_assigned || 0),
      conversion_rate: calculateChange(current.conversion_rate || 0, previous.conversion_rate || 0),
    };

    return NextResponse.json({
      ...current,
      previous,
      change,
    });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
