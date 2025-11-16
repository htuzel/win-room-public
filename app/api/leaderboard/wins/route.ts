// Win Room v2.0 - GET /api/leaderboard/wins
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { isAdminOrFinance } from '@/lib/auth/jwt';
import { query } from '@/lib/db/connection';
import { LeaderboardEntry } from '@/lib/types';
import { getPeriodRange, normalizePeriod } from '@/lib/helpers/periods';

interface WinsRow {
  seller_id: string;
  win_count: string | number;
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

    // Get leaderboard data
    const results = await query<WinsRow>(`
      SELECT
        sa.seller_id,
        COALESCE(SUM(sa.share_percent), 0) as win_count
      FROM wr.attribution_share_entries sa
      JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      JOIN wr.queue q ON q.subscription_id = sa.subscription_id
      LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
      WHERE ${dateClause}
        AND r.id IS NULL
      GROUP BY sa.seller_id
      ORDER BY win_count DESC
    `, queryParams);

    // Use 8 wins as reference, but if someone exceeds it, use highest value as max
    const WINS_REFERENCE = 8;
    const actualMaxWins = results.length > 0 ? parseFloat(results[0].win_count) : 1;
    const maxWins = Math.max(WINS_REFERENCE, actualMaxWins);

    // Build response
    const leaderboard: LeaderboardEntry[] = results.map((row, index) => {
      const wins = parseFloat(row.win_count);
      const entry: LeaderboardEntry = {
        seller_id: row.seller_id,
        rank: index + 1,
        bar_value_norm: maxWins > 0 ? wins / maxWins : 0,
        value: wins,
        value_unit: 'count',
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
          win_count: parseFloat(row.win_count),
        }))
      );
    }

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
