// Win Room v2.0 - Manual Queue Entry API
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { queryOne, transaction } from '@/lib/db/connection';
import { generateFingerprint } from '@/lib/helpers/metrics';
import type { FinanceStatus } from '@/lib/types';

interface ManualQueueRequest {
  subscription_id: number;
  revenue_usd: number;
  cost_usd: number;
  subs_amount: number;
  currency: string;
  payment_channel: string;
  campaign_name?: string;
  finance_status?: FinanceStatus;
  finance_notes?: string;
  custom_note?: string;
}

const ALLOWED_ROLES = new Set(['sales', 'sales_lead', 'admin', 'finance']);
const VALID_FINANCE_STATUSES: FinanceStatus[] = ['waiting', 'approved', 'installment', 'problem'];

export async function POST(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: ManualQueueRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    subscription_id,
    revenue_usd,
    cost_usd,
    subs_amount,
    currency,
    payment_channel,
    campaign_name,
    finance_status = 'waiting',
    finance_notes,
    custom_note,
  } = body;

  if (
    !subscription_id ||
    typeof subscription_id !== 'number' ||
    Number.isNaN(subscription_id)
  ) {
    return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 });
  }

  if (
    typeof revenue_usd !== 'number' ||
    typeof cost_usd !== 'number' ||
    typeof subs_amount !== 'number' ||
    Number.isNaN(revenue_usd) ||
    Number.isNaN(cost_usd) ||
    Number.isNaN(subs_amount)
  ) {
    return NextResponse.json({ error: 'revenue_usd, cost_usd and subs_amount must be numbers' }, { status: 400 });
  }

  if (revenue_usd <= 0) {
    return NextResponse.json({ error: 'revenue_usd must be greater than 0' }, { status: 400 });
  }

  if (cost_usd < 0) {
    return NextResponse.json({ error: 'cost_usd cannot be negative' }, { status: 400 });
  }

  if (!currency || typeof currency !== 'string') {
    return NextResponse.json({ error: 'currency is required' }, { status: 400 });
  }

  if (!payment_channel || typeof payment_channel !== 'string') {
    return NextResponse.json({ error: 'payment_channel is required' }, { status: 400 });
  }

  if (!VALID_FINANCE_STATUSES.includes(finance_status)) {
    return NextResponse.json({
      error: `finance_status must be one of: ${VALID_FINANCE_STATUSES.join(', ')}`,
    }, { status: 400 });
  }

  const subscription = await queryOne<{
    id: number;
    user_id: number;
    campaign_id: number;
    created_at: string;
    sales_person: string | null;
    stripe_sub_id: string | null;
    paypal_sub_id: string | null;
  }>(
    `SELECT id, user_id, campaign_id, created_at, sales_person, stripe_sub_id, paypal_sub_id
     FROM subscriptions
     WHERE id = $1`,
    [subscription_id]
  );

  if (!subscription) {
    return NextResponse.json({ error: `Subscription #${subscription_id} not found` }, { status: 404 });
  }

  const fingerprint = generateFingerprint({
    user_id: subscription.user_id,
    campaign_id: subscription.campaign_id,
    created_at: subscription.created_at,
    stripe_sub_id: subscription.stripe_sub_id || undefined,
    paypal_sub_id: subscription.paypal_sub_id || undefined,
  });

  const margin_amount_usd = revenue_usd - cost_usd;
  const margin_percent = revenue_usd > 0 ? margin_amount_usd / revenue_usd : 0;

  try {
    const result = await transaction(async (client) => {
      // Lock queue row if exists
      const existingQueue = await client.query(
        `SELECT id, status
         FROM wr.queue
         WHERE subscription_id = $1
         FOR UPDATE`,
        [subscription_id]
      );

      if (existingQueue.rows.length > 0 && existingQueue.rows[0].status === 'pending') {
        throw new Error('QUEUE_ALREADY_PENDING');
      }

      // Update subscription financial fields
      await client.query(
        `UPDATE subscriptions
         SET
           subs_amount = $1::numeric,
           currency = $2::varchar,
           payment_channel = $3::varchar,
           custom_note = COALESCE(NULLIF($4::varchar, ''), custom_note)
         WHERE id = $5`,
        [subs_amount, currency, payment_channel, custom_note || null, subscription_id]
      );

      // Update campaign if provided
      if (campaign_name && campaign_name.trim() !== '') {
        // Check if campaign exists
        const existingCampaign = await client.query(
          `SELECT id FROM campaigns WHERE campaign_name = $1 LIMIT 1`,
          [campaign_name.trim()]
        );

        if (existingCampaign.rows.length > 0) {
          // Use existing campaign
          const campaignId = existingCampaign.rows[0].id;

          // Update subscription with campaign_id
          await client.query(
            `UPDATE subscriptions SET campaign_id = $1 WHERE id = $2`,
            [campaignId, subscription_id]
          );
        } else {
          throw new Error('CAMPAIGN_NOT_FOUND');
        }
      }

      // Upsert subscription metrics
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
         VALUES ($1, $2, $3, $4, $5, false, NOW(), 'manual_entry')
         ON CONFLICT (subscription_id)
         DO UPDATE SET
           revenue_usd = EXCLUDED.revenue_usd,
           cost_usd = EXCLUDED.cost_usd,
           margin_amount_usd = EXCLUDED.margin_amount_usd,
           margin_percent = EXCLUDED.margin_percent,
           computed_at = NOW(),
           currency_source = 'manual_entry'`,
        [subscription_id, revenue_usd, cost_usd, margin_amount_usd, margin_percent]
      );

      // Insert or update queue row
      let queueId: number;
      if (existingQueue.rows.length === 0) {
        const insertedQueue = await client.query(
          `INSERT INTO wr.queue (
             subscription_id,
             user_id,
             source_created_at,
             status,
             fingerprint,
             created_by,
             finance_status,
             finance_notes,
             excluded_by,
             excluded_at,
             exclude_reason,
             created_at
           )
           VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, NULL, NULL, NULL, NOW())
           RETURNING id`,
          [
            subscription_id,
            subscription.user_id,
            subscription.created_at,
            fingerprint,
            user.seller_id,
            finance_status,
            finance_notes || null,
          ]
        );
        queueId = insertedQueue.rows[0].id;
      } else {
        const existingId = existingQueue.rows[0].id;
        await client.query(
          `UPDATE wr.queue
           SET status = 'pending',
               user_id = $2,
               source_created_at = $3,
               fingerprint = $4,
               created_by = $5,
               created_at = NOW(),
               finance_status = $6,
               finance_notes = $7,
               excluded_by = NULL,
               excluded_at = NULL,
               exclude_reason = NULL
           WHERE id = $1`,
          [
            existingId,
            subscription.user_id,
            subscription.created_at,
            fingerprint,
            user.seller_id,
            finance_status,
            finance_notes || null,
          ]
        );
        queueId = existingId;
      }

      // Refresh adjusted metrics view for consistency
      await client.query('REFRESH MATERIALIZED VIEW wr.claim_metrics_adjusted');

      // Emit queue.new event with manual flag
      await client.query(
        `INSERT INTO wr.events (type, subscription_id, actor, payload)
         VALUES ('queue.new', $1, $2, $3)`,
        [
          subscription_id,
          user.seller_id,
          JSON.stringify({
            manual: true,
            created_by: user.seller_id,
            margin_percent,
            finance_status,
          }),
        ]
      );

      return { queueId };
    });

    return NextResponse.json({
      success: true,
      queue_id: result.queueId,
      message: `Subscription #${subscription_id} added to queue manually`,
    });
  } catch (error: any) {
    if (error instanceof Error && error.message === 'QUEUE_ALREADY_PENDING') {
      return NextResponse.json(
        { error: 'Subscription is already pending in queue' },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === 'CAMPAIGN_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Campaign not found. Please select an existing campaign.' },
        { status: 404 }
      );
    }

    console.error('[Manual Queue] Failed to create manual queue entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
