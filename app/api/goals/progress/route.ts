// Win Room v2.0 - GET /api/goals/progress
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get global goals progress (only percentage)
    const progress = await query<any>(`
      SELECT
        g.id as goal_id,
        g.period_type,
        g.target_type,
        COALESCE(pc.percent, 0) as percent
      FROM wr.sales_goals g
      LEFT JOIN wr.progress_cache pc
        ON pc.goal_scope = 'global'
        AND pc.goal_id = g.id
        AND pc.as_of_date = $1::date
      WHERE g.period_start <= $1::date
        AND g.period_end >= $1::date
        AND g.visibility_scope = 'sales_percent_only'
      ORDER BY g.period_type
    `, [today]);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Goals progress fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
