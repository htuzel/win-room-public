// Win Room v2.0 - GET /api/me/goals
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get personal goals progress (only for owner)
    const progress = await query<any>(`
      SELECT
        pg.id as goal_id,
        pg.period_type,
        pg.target_type,
        pg.target_value,
        COALESCE(pc.percent, 0) as percent
      FROM wr.personal_goals pg
      LEFT JOIN wr.progress_cache pc
        ON pc.goal_scope = 'personal'
        AND pc.goal_id = pg.id
        AND pc.as_of_date = $2::date
      WHERE pg.seller_id = $1
        AND pg.period_start <= $2::date
        AND pg.period_end >= $2::date
        AND pg.visibility_scope = 'owner_only'
      ORDER BY pg.period_type
    `, [user.seller_id, today]);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Personal goals fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
