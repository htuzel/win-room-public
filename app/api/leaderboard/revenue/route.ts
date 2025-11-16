// Win Room v2.0 - GET /api/leaderboard/revenue
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { isAdminOrFinance } from '@/lib/auth/jwt';
import { query } from '@/lib/db/connection';
import { LeaderboardEntry } from '@/lib/types';
import { getPeriodRange, normalizePeriod } from '@/lib/helpers/periods';

interface RevenueRow {
  seller_id: string;
  total_revenue: string | number;
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
  const detailed = searchParams.get('detailed') === 'true';

  try {
    // Determine date range using helper function
    const { startDate, endDate } = getPeriodRange(period);
    const dateClause = endDate
      ? `q.created_at >= $1::date AND q.created_at < ($2::date + interval '1 day')`
      : `q.created_at >= $1::date`;
    const queryParams = endDate ? [startDate, endDate] : [startDate];

    // Get revenue leaderboard
    const results = await query<RevenueRow>(
      `
      SELECT
        sa.seller_id,
        SUM(sm.revenue_usd * sa.share_percent) AS total_revenue
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE ${dateClause}
        AND r.id IS NULL
      GROUP BY sa.seller_id
      HAVING SUM(sm.revenue_usd * sa.share_percent) > 0
      ORDER BY total_revenue DESC
    `,
      queryParams,
    );

    // Use $4000 as reference, but if someone exceeds it, use highest value as max
    const REVENUE_REFERENCE = 5000;
    const actualMaxRevenue = results.length > 0 ? parseFloat(results[0].total_revenue) : 1;
    const maxRevenue = Math.max(REVENUE_REFERENCE, actualMaxRevenue);

    const leaderboard: LeaderboardEntry[] = results.map((row, index) => {
      const revenue = parseFloat(row.total_revenue);
      const entry: LeaderboardEntry = {
        seller_id: row.seller_id,
        rank: index + 1,
        bar_value_norm: maxRevenue > 0 ? revenue / maxRevenue : 0,
        value: revenue,
        value_unit: 'usd',
      };

      if (row.seller_id === user.seller_id) {
        entry.you = true;
      }

      return entry;
    });

    if (detailed && isAdminOrFinance(user)) {
      return NextResponse.json(
        results.map((row, index) => ({
          ...leaderboard[index],
          total_revenue: parseFloat(row.total_revenue),
        })),
      );
    }

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Revenue leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
