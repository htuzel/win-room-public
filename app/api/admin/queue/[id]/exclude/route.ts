// Win Room v2.0 - Admin Queue Exclude API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/connection';
import { requireRoles } from '@/lib/auth/middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST - Exclude a queue item (hide from sellers, keep for admin/finance)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const queueId = parseInt(params.id);
  if (isNaN(queueId)) {
    return NextResponse.json({ error: 'Invalid queue ID' }, { status: 400 });
  }

  try {
    // Check if queue item exists
    const queueItem = await queryOne<any>(
      `SELECT id, subscription_id, status
       FROM wr.queue
       WHERE id = $1`,
      [queueId]
    );

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    // Update status to 'excluded'
    const result = await query<any>(
      `UPDATE wr.queue
       SET status = 'excluded', updated_at = NOW()
       WHERE id = $1
       RETURNING id, subscription_id, status`,
      [queueId]
    );

    return NextResponse.json({
      success: true,
      message: `Queue item #${queueId} excluded from seller view`,
      subscription_id: result[0].subscription_id,
      status: result[0].status,
    });
  } catch (error) {
    console.error('Queue exclude error:', error);
    return NextResponse.json({ error: 'Failed to exclude queue item' }, { status: 500 });
  }
}
