// Win Room v2.0 - POST /api/admin/queue/exclude
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { ExcludeRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  // Require admin, finance, or sales lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body: ExcludeRequest = await req.json();
    const { subscription_id, reason, notes } = body;

    // Update queue
    await query(
      `UPDATE wr.queue
       SET status = 'excluded', excluded_by = $1, excluded_at = NOW(), exclude_reason = $2
       WHERE subscription_id = $3`,
      [user.seller_id, reason, subscription_id]
    );

    // Insert exclusion record
    await query(
      `INSERT INTO wr.exclusions (subscription_id, reason, excluded_by, notes)
       VALUES ($1, $2, $3, $4)`,
      [subscription_id, reason, user.seller_id, notes || null]
    );

    // Create event
    await query(
      `INSERT INTO wr.events (type, subscription_id, actor, payload)
       VALUES ('queue.excluded', $1, $2, $3)`,
      [subscription_id, user.seller_id, JSON.stringify({ reason })]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Exclude error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
