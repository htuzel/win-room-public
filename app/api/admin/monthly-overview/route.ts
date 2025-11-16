// Win Room v2.0 - Monthly Sales Overview API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

interface MonthlyStatsRow {
  year: string | number;
  month: string | number;
  total_sales: string | number;
  total_revenue_usd: string | number;
  total_margin_usd: string | number;
  original_margin_usd: string | number;
  total_adjustments_usd: string | number;
  avg_margin_percent: string | number;
}

export async function GET(req: NextRequest) {
  // Require admin/finance role
  const authResult = await requireRoles(req, ['admin', 'finance']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    // Get monthly breakdown of all sales from the beginning
    const monthlyStats = await query<MonthlyStatsRow>(
      `SELECT
        EXTRACT(YEAR FROM q.created_at) as year,
        EXTRACT(MONTH FROM q.created_at) as month,
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
      WHERE r.id IS NULL
      GROUP BY EXTRACT(YEAR FROM q.created_at), EXTRACT(MONTH FROM q.created_at)
      ORDER BY year DESC, month DESC`
    );

    // Format response
    const formattedStats = monthlyStats.map((row) => ({
      year: parseInt(String(row.year)),
      month: parseInt(String(row.month)),
      total_sales: parseFloat(String(row.total_sales || '0')),
      total_revenue_usd: parseFloat(String(row.total_revenue_usd || '0')),
      total_margin_usd: parseFloat(String(row.total_margin_usd || '0')),
      original_margin_usd: parseFloat(String(row.original_margin_usd || '0')),
      total_adjustments_usd: parseFloat(String(row.total_adjustments_usd || '0')),
      avg_margin_percent: parseFloat(String(row.avg_margin_percent || '0')),
    }));

    return NextResponse.json(formattedStats);
  } catch (error) {
    console.error('Monthly overview fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
