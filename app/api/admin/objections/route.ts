// Win Room v2.0 - GET /api/admin/objections (List all objections)
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  // Require admin/finance role
  const authResult = await requireRoles(req, ['admin', 'finance']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending'; // pending, accepted, rejected, all

  try {
    let whereClause = '';
    if (status !== 'all') {
      whereClause = 'WHERE o.status = $1';
    }

    const objections = await query<any>(
      `SELECT
        o.id,
        o.subscription_id,
        o.raised_by,
        o.reason,
        o.details,
        o.status,
        o.admin_note,
        o.created_at,
        o.resolved_at,
        c.claimed_by,
        s.display_name as claimer_display_name
      FROM wr.objections o
      LEFT JOIN wr.claims c ON c.subscription_id = o.subscription_id
      LEFT JOIN wr.sellers s ON s.seller_id = c.claimed_by
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT 100`,
      status !== 'all' ? [status] : []
    );

    return NextResponse.json(objections);
  } catch (error) {
    console.error('Objections fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
