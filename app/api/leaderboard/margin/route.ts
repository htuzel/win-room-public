// Win Room v2.0 - GET /api/leaderboard/margin
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { isAdminOrFinance } from '@/lib/auth/jwt';
import { query } from '@/lib/db/connection';
import { LeaderboardEntry } from '@/lib/types';
import { getPeriodRange, normalizePeriod } from '@/lib/helpers/periods';

interface MarginRow {
  seller_id: string;
  total_margin: string | number;
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

    // Get margin leaderboard (using adjusted margins if available)
    const results = await query<MarginRow>(`
      SELECT
        sa.seller_id,
        -- Use adjusted margin if available, fallback to original
        SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent) as total_margin
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      JOIN wr.subscription_metrics sm ON sm.subscription_id = sa.subscription_id
      LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE ${dateClause}
        AND r.id IS NULL
      GROUP BY sa.seller_id
      HAVING SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd) * sa.share_percent) > 0
      ORDER BY total_margin DESC
    `, queryParams);

    // Use $2000 as reference, but if someone exceeds it, use highest value as max
    const MARGIN_REFERENCE = 2500;
    const actualMaxMargin = results.length > 0 ? parseFloat(results[0].total_margin) : 1;
    const maxMargin = Math.max(MARGIN_REFERENCE, actualMaxMargin);

    // Build response
    const leaderboard: LeaderboardEntry[] = results.map((row, index) => {
      const margin = parseFloat(row.total_margin);
      const entry: LeaderboardEntry = {
        seller_id: row.seller_id,
        rank: index + 1,
        bar_value_norm: maxMargin > 0 ? margin / maxMargin : 0,
        value: margin,
        value_unit: 'usd',
      };

      // Mark user's own entry
      if (row.seller_id === user.seller_id) {
        entry.you = true;
      }

      return entry;
    });

    // If admin requests detailed view, add actual numbers
    if (detailed && isAdminOrFinance(user)) {
      return NextResponse.json(
        results.map((row, index) => ({
          ...leaderboard[index],
          total_margin: parseFloat(row.total_margin),
        }))
      );
    }

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Margin leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
