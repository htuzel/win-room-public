// Win Room v2.0 - PATCH /api/admin/objections/:id
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { transaction } from '@/lib/db/connection';
import { ObjectionResolveRequest } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin/finance role
  const authResult = await requireRoles(req, ['admin', 'finance']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const objectionId = parseInt(params.id);

  try {
    const body: ObjectionResolveRequest = await req.json();
    const { status, admin_note, action, reassign_to } = body;

    await transaction(async (client) => {
      // Get objection details
      const objection = await client.query(
        'SELECT subscription_id FROM wr.objections WHERE id = $1',
        [objectionId]
      );

      if (objection.rows.length === 0) {
        throw new Error('Objection not found');
      }

      const subscriptionId = objection.rows[0].subscription_id;
      const existingClaim = await client.query(
        `SELECT claim_type FROM wr.claims WHERE subscription_id = $1`,
        [subscriptionId]
      );
      const originalClaimType = existingClaim.rows[0]?.claim_type || null;

      if (status === 'accepted' && action) {
        // Perform action
        switch (action) {
          case 'reassign':
            if (!reassign_to) {
              throw new Error('reassign_to required');
            }

            const targetSeller = await client.query(
              `SELECT seller_id, display_name
               FROM wr.sellers
               WHERE seller_id = $1
                 AND is_active = TRUE`,
              [reassign_to]
            );

            if (targetSeller.rows.length === 0) {
              throw new Error('Target seller not found');
            }

            const targetSellerId = targetSeller.rows[0].seller_id;
            const targetDisplayName = targetSeller.rows[0].display_name || targetSellerId;

            // Update attribution
            await client.query(
              `UPDATE wr.attribution
               SET closer_seller_id = $1,
                   assisted_seller_id = NULL,
                   closer_share_percent = 1.0,
                   assisted_share_percent = 0.0,
                   resolved_from = 'manual',
                   resolved_at = NOW()
               WHERE subscription_id = $2`,
              [targetSellerId, subscriptionId]
            );

            // Update claim if exists
            await client.query(
              `UPDATE wr.claims SET claimed_by = $1 WHERE subscription_id = $2`,
              [targetDisplayName, subscriptionId]
            );

            await client.query(
              `INSERT INTO wr.events (type, subscription_id, actor, payload)
               VALUES ('claimed', $1, $2, $3)`,
              [
                subscriptionId,
                targetSellerId,
                JSON.stringify({ claim_type: originalClaimType || 'reassigned' }),
              ]
            );
            break;

          case 'exclude':
            // Remove claim and attribution so metrics reflect exclusion
            await client.query(
              `DELETE FROM wr.claims WHERE subscription_id = $1`,
              [subscriptionId]
            );

            await client.query(
              `DELETE FROM wr.attribution WHERE subscription_id = $1`,
              [subscriptionId]
            );

            // Update queue status
            await client.query(
              `UPDATE wr.queue
               SET status = 'excluded', excluded_by = $1, excluded_at = NOW(), exclude_reason = 'objection'
               WHERE subscription_id = $2`,
              [user.seller_id, subscriptionId]
            );

            // Insert exclusion record
            await client.query(
              `INSERT INTO wr.exclusions (subscription_id, reason, excluded_by, notes)
               VALUES ($1, 'objection', $2, $3)`,
              [subscriptionId, user.seller_id, admin_note || null]
            );

            await client.query(
              `INSERT INTO wr.events (type, subscription_id, actor, payload)
               VALUES ('queue.excluded', $1, $2, $3)`,
              [subscriptionId, user.seller_id, JSON.stringify({ reason: 'objection' })]
            );
            break;

          case 'refund':
            // Insert refund record
            await client.query(
              `INSERT INTO wr.refunds (subscription_id, reason)
               VALUES ($1, 'objection')
               ON CONFLICT (subscription_id) DO NOTHING`,
              [subscriptionId]
            );

            // Update queue
            await client.query(
              `UPDATE wr.queue SET status = 'refunded' WHERE subscription_id = $1`,
              [subscriptionId]
            );

            await client.query(
              `INSERT INTO wr.events (type, subscription_id, actor, payload)
               VALUES ('refund.applied', $1, $2, $3)`,
              [subscriptionId, user.seller_id, JSON.stringify({ reason: 'objection' })]
            );
            break;
        }
      }

      // Update objection status
      await client.query(
        `UPDATE wr.objections
         SET status = $1, admin_note = $2, resolved_at = NOW()
         WHERE id = $3`,
        [status, admin_note || null, objectionId]
      );

      // Create event
      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor, payload)
         VALUES ('objection.resolved', $1, $2, $3)`,
        [
          subscriptionId,
          user.seller_id,
          JSON.stringify({ objection_id: objectionId, status, action })
        ]
      );

      // Notify clients to refresh goal/leaderboard data
      await client.query(
        `INSERT INTO wr.events (type, actor)
         VALUES ('goal.progress', $1)`,
        [user.seller_id]
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Objection resolution error:', error);

    const message = error instanceof Error ? error.message : null;

    if (message === 'Objection not found') {
      return NextResponse.json(
        { error: 'Objection not found' },
        { status: 404 }
      );
    }

    if (message === 'reassign_to required' || message === 'Target seller not found') {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
