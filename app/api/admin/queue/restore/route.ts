// Win Room v2.0 - POST /api/admin/queue/restore
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { transaction } from '@/lib/db/connection';

interface RestoreRequest {
  subscription_id: number;
  notes?: string;
}

export async function POST(req: NextRequest) {
  // Require admin, finance, or sales lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body: RestoreRequest = await req.json();
    const { subscription_id, notes } = body;

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'subscription_id is required' },
        { status: 400 }
      );
    }

    await transaction(async (client) => {
      // Check if item exists and is excluded
      const queueItem = await client.query(
        'SELECT status FROM wr.queue WHERE subscription_id = $1',
        [subscription_id]
      );

      if (queueItem.rows.length === 0) {
        throw new Error('Queue item not found');
      }

      if (queueItem.rows[0].status !== 'excluded') {
        throw new Error('Only excluded items can be restored');
      }

      // Check if already claimed
      const existingClaim = await client.query(
        'SELECT id FROM wr.claims WHERE subscription_id = $1',
        [subscription_id]
      );

      if (existingClaim.rows.length > 0) {
        throw new Error('Cannot restore: item has been claimed');
      }

      // Restore queue item to pending
      await client.query(
        `UPDATE wr.queue
         SET status = 'pending',
             excluded_by = NULL,
             excluded_at = NULL,
             exclude_reason = NULL
         WHERE subscription_id = $1`,
        [subscription_id]
      );

      // Delete exclusion record
      await client.query(
        'DELETE FROM wr.exclusions WHERE subscription_id = $1',
        [subscription_id]
      );

      // Create event
      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor, payload)
         VALUES ('queue.restored', $1, $2, $3)`,
        [subscription_id, user.seller_id, JSON.stringify({ notes: notes || null })]
      );

      // Emit queue.new event so clients refresh
      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor)
         VALUES ('queue.new', $1, $2)`,
        [subscription_id, user.seller_id]
      );
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Restore error:', error);

    if (error.message === 'Queue item not found') {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Only excluded items can be restored') {
      return NextResponse.json(
        { error: 'Only excluded items can be restored' },
        { status: 400 }
      );
    }

    if (error.message === 'Cannot restore: item has been claimed') {
      return NextResponse.json(
        { error: 'Cannot restore claimed items' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
