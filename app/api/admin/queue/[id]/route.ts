// Win Room v2.0 - Admin Single Queue Item Management
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, transaction } from '@/lib/db/connection';
import { requireRoles } from '@/lib/auth/middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

interface QueueEditRequest {
  revenue_usd: number;
  cost_usd: number;
  subs_amount: number;
  currency: string;
  payment_channel: string;
  campaign_name: string;
  custom_note?: string;
}

// PATCH - Edit queue item metrics
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const queueId = parseInt(params.id);

  if (isNaN(queueId)) {
    return NextResponse.json({ error: 'Invalid queue ID' }, { status: 400 });
  }

  try {
    const body: QueueEditRequest = await req.json();
    const {
      revenue_usd,
      cost_usd,
      subs_amount,
      currency,
      payment_channel,
      campaign_name,
      custom_note,
    } = body;

    // Validation
    if (revenue_usd < 0 || cost_usd < 0) {
      return NextResponse.json(
        { error: 'Revenue and cost cannot be negative' },
        { status: 400 }
      );
    }

    if (subs_amount <= 0) {
      return NextResponse.json(
        { error: 'Subscription amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if queue item exists and get subscription_id
    const queueItem = await queryOne<any>(
      `SELECT id, subscription_id, status
       FROM wr.queue
       WHERE id = $1`,
      [queueId]
    );

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const subscriptionId = queueItem.subscription_id;

    // Calculate margin
    const margin_amount_usd = revenue_usd - cost_usd;
    const margin_percent = revenue_usd > 0 ? margin_amount_usd / revenue_usd : 0;

    // Update subscription and metrics in a transaction
    await transaction(async (client) => {
      // Update subscription table
      await client.query(
        `UPDATE subscriptions
         SET
           subs_amount = $1::numeric,
           currency = $2::varchar,
           payment_channel = $3::varchar,
           custom_note = COALESCE(NULLIF($4::varchar, ''), custom_note)
         WHERE id = $5`,
        [subs_amount, currency, payment_channel, custom_note || null, subscriptionId]
      );

      // Update payment_infos table if exists
      const paymentConv = await client.query(
        `SELECT paymentinfo_id FROM payment_conversations WHERE subscription_id = $1 LIMIT 1`,
        [subscriptionId]
      );

      if (paymentConv.rows.length > 0 && paymentConv.rows[0].paymentinfo_id) {
        await client.query(
          `UPDATE payment_infos
           SET
             price = $1::numeric,
             "paidPrice" = $1::numeric,
             currency = $2::varchar,
             payment_channel = $3::varchar
           WHERE id = $4`,
          [subs_amount, currency, payment_channel, paymentConv.rows[0].paymentinfo_id]
        );
      }

      // Update campaign if needed
      if (campaign_name && campaign_name.trim() !== '') {
        // First check if campaign exists
        const existingCampaign = await client.query(
          `SELECT id FROM campaigns WHERE name = $1 LIMIT 1`,
          [campaign_name.trim()]
        );

        let campaignId: number;
        if (existingCampaign.rows.length > 0) {
          // Use existing campaign
          campaignId = existingCampaign.rows[0].id;
        } else {
          // Create new campaign
          const newCampaign = await client.query(
            `INSERT INTO campaigns (name) VALUES ($1) RETURNING id`,
            [campaign_name.trim()]
          );
          campaignId = newCampaign.rows[0].id;
        }

        // Update subscription campaign_id
        await client.query(
          `UPDATE subscriptions SET campaign_id = $1 WHERE id = $2`,
          [campaignId, subscriptionId]
        );
      }

      // Update or insert subscription_metrics
      await client.query(
        `INSERT INTO wr.subscription_metrics (
           subscription_id,
           revenue_usd,
           cost_usd,
           margin_amount_usd,
           margin_percent,
           is_jackpot,
           computed_at,
           currency_source
         )
         VALUES ($1, $2, $3, $4, $5, false, NOW(), 'manual_edit')
         ON CONFLICT (subscription_id)
         DO UPDATE SET
           revenue_usd = EXCLUDED.revenue_usd,
           cost_usd = EXCLUDED.cost_usd,
           margin_amount_usd = EXCLUDED.margin_amount_usd,
           margin_percent = EXCLUDED.margin_percent,
           computed_at = NOW(),
           currency_source = 'manual_edit'`,
        [subscriptionId, revenue_usd, cost_usd, margin_amount_usd, margin_percent]
      );

      // Refresh materialized view for adjusted metrics
      await client.query('REFRESH MATERIALIZED VIEW wr.claim_metrics_adjusted');
    });

    return NextResponse.json({
      success: true,
      message: 'Queue item updated successfully',
      subscription_id: subscriptionId,
    });
  } catch (error) {
    console.error('Queue item update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a single queue item
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const queueId = parseInt(params.id);
  if (isNaN(queueId)) {
    return NextResponse.json({ error: 'Invalid queue ID' }, { status: 400 });
  }

  try {
    const result = await query<any>(`
      DELETE FROM wr.queue
      WHERE id = $1
      RETURNING id, subscription_id
    `, [queueId]);

    if (result.length === 0) {
      return NextResponse.json({
        error: 'Queue item not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Queue item #${queueId} (Subscription #${result[0].subscription_id}) deleted successfully`
    });
  } catch (error) {
    console.error('Admin delete queue item error:', error);
    return NextResponse.json({
      error: 'Failed to delete queue item'
    }, { status: 500 });
  }
}
