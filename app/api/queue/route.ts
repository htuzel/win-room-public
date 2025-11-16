// Win Room v2.0 - GET /api/queue
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { QueueItem } from '@/lib/types';
import { calculateMetrics, calculateTTS } from '@/lib/helpers/metrics';

interface QueueQueryRow {
  id: number;
  subscription_id: number;
  user_id: number;
  source_created_at: string;
  status: string;
  created_at: string;
  created_by: string | null;
  is_manual: boolean;
  user_created_at: string | null;
  customer_email: string | null;
  customer_name: string | null;
  is_kid_account: boolean | null;
  claim_suggested_seller: string | null;
  margin_percent: string | number | null;
  revenue_usd: string | number | null;
  cost_usd: string | number | null;
  margin_amount_usd: string | number | null;
  payment_channel: string | null;
  sales_person: string | null;
  subs_amount: string | number | null;
  currency: string | null;
  campaign_lenght: string | number | null;
  per_week: string | number | null;
  campaign_minute: string | number | null;
  is_free: string | number | null;
  subscription_status: string | null;
  subscription_created_at: string | null;
  custom_note: string | null;
  subs_note: string | null;
  campaign_name: string | null;
  created_by_email: string | null;
}

export async function GET(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    // Get pending queue items with joined data including customer and campaign info
    const items = await query<QueueQueryRow>(`
      SELECT
        q.id,
        q.subscription_id,
        q.user_id,
        q.source_created_at,
        q.status,
        q.created_at,
        q.created_by,
        (q.created_by IS NOT NULL) AS is_manual,
        u.created_at as user_created_at,
        u.email as customer_email,
        u.name as customer_name,
        u.is_kid as is_kid_account,
        s.display_name as claim_suggested_seller,
        sm.margin_percent,
        sm.revenue_usd,
        sm.cost_usd,
        sm.margin_amount_usd,
        subs.payment_channel,
        subs.sales_person,
        subs.subs_amount,
        subs.currency,
        c.campaign_lenght,
        c.per_week,
        c.campaign_minute,
        subs.is_free,
        subs.status as subscription_status,
        subs.created_at as subscription_created_at,
        subs.custom_note,
        subs.subs_note,
        c.campaign_name,
        -- Fallback: queue creator → subscription creator (user)
        COALESCE(creator.email, subs_creator.email) as created_by_email
      FROM wr.queue q
      LEFT JOIN users u ON u.id = q.user_id
      LEFT JOIN subscriptions subs ON subs.id = q.subscription_id
      LEFT JOIN campaigns c ON c.id = subs.campaign_id
      LEFT JOIN wr.sellers s ON s.core_sales_person = subs.sales_person
      LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = q.subscription_id
      LEFT JOIN wr.sellers creator ON creator.seller_id = q.created_by
      LEFT JOIN users subs_creator ON subs_creator.id = subs.created_by
      WHERE q.status = 'pending'
      ORDER BY q.created_at DESC
      LIMIT $1
    `, [limit]);

    // Calculate TTS and format response (ensure numbers are numbers, not strings)
    const hydratedItems = await Promise.all(
      items.map(async (item) => {
        const hasMetrics = item.revenue_usd != null && item.cost_usd != null;

        if (!hasMetrics) {
          try {
            const metricsInput = {
              subscription_id: Number(item.subscription_id),
              subs_amount: item.subs_amount != null ? Number(item.subs_amount) : null,
              currency: item.currency,
              campaign_lenght: Number(item.campaign_lenght || 0),
              per_week: Number(item.per_week || 0),
              campaign_minute: Number(item.campaign_minute || 25),
              is_free: Number(item.is_free || 0),
              payment_channel: item.payment_channel || '',
              status: item.subscription_status || '',
            };

            const metrics = await calculateMetrics(metricsInput);

            await query(
              `INSERT INTO wr.subscription_metrics
               (subscription_id, revenue_usd, cost_usd, margin_amount_usd, margin_percent, is_jackpot, currency_source)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (subscription_id) DO UPDATE
               SET revenue_usd = EXCLUDED.revenue_usd,
                   cost_usd = EXCLUDED.cost_usd,
                   margin_amount_usd = EXCLUDED.margin_amount_usd,
                   margin_percent = EXCLUDED.margin_percent,
                   is_jackpot = EXCLUDED.is_jackpot,
                   currency_source = EXCLUDED.currency_source,
                   computed_at = NOW()`,
              [
                metricsInput.subscription_id,
                metrics.revenue_usd,
                metrics.cost_usd,
                metrics.margin_amount_usd,
                metrics.margin_percent,
                metrics.is_jackpot,
                metrics.currency_source,
              ]
            );

            item.revenue_usd = metrics.revenue_usd;
            item.cost_usd = metrics.cost_usd;
            item.margin_amount_usd = metrics.margin_amount_usd;
            item.margin_percent = metrics.margin_percent;
          } catch (error) {
            console.error(
              `[Queue] Failed to backfill metrics for subscription ${item.subscription_id}:`,
              error
            );
          }
        }

        return item;
      })
    );

    const response: Partial<QueueItem>[] = hydratedItems.map((item) => {
      const tts = item.user_created_at
        ? calculateTTS(item.user_created_at, item.source_created_at)
        : undefined;

      return {
        id: Number(item.id),
        subscription_id: Number(item.subscription_id),
        user_id: Number(item.user_id),
        source_created_at: item.source_created_at,
        status: item.status,
        created_at: item.created_at,
        created_by: item.created_by,
        is_manual: item.is_manual,
        created_by_email: item.created_by_email,
        tts,
        claim_suggested_seller: item.claim_suggested_seller,
        margin_percent: item.margin_percent ? Number(item.margin_percent) : undefined,
        payment_channel: item.payment_channel,
        sales_person: item.sales_person,
        customer_email: item.customer_email,
        customer_name: item.customer_name,
        is_kid_account: item.is_kid_account,
        campaign_name: item.campaign_name,
        revenue_usd: item.revenue_usd ? Number(item.revenue_usd) : undefined,
        cost_usd: item.cost_usd ? Number(item.cost_usd) : undefined,
        margin_amount_usd: item.margin_amount_usd ? Number(item.margin_amount_usd) : undefined,
        subs_amount: item.subs_amount ? Number(item.subs_amount) : undefined,
        currency: item.currency,
        subscription_created_at: item.subscription_created_at,
        custom_note: item.custom_note,
        subs_note: item.subs_note,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Queue fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
