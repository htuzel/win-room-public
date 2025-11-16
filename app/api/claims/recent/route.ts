// Win Room v2.0 - Recent Claims API
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { calculateTTS } from '@/lib/helpers/metrics';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const limit = 12; // Last 10 claims

    const claims = await query<{
      id: number;
      subscription_id: number;
      claimed_by: string;
      claim_type: string;
      revenue_usd: number | null;
      margin_amount_usd: number | null;
      created_at: string;
      user_created_at: string | null;
      subscription_created_at: string | null;
      queue_created_at: string | null;
      queue_created_by: string | null;
      queue_created_by_email: string | null;
      queue_is_manual: boolean;
    }>(
      `SELECT
        c.id,
        c.subscription_id,
        c.claimed_by,
        c.claim_type,
        sm.revenue_usd,
        sm.margin_amount_usd,
        c.claimed_at as created_at,
        u.created_at AS user_created_at,
        subs.created_at AS subscription_created_at,
        q.created_at AS queue_created_at,
        q.created_by AS queue_created_by,
        queue_creator.email AS queue_created_by_email,
        (q.created_by IS NOT NULL) AS queue_is_manual
       FROM wr.claims c
       LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
       LEFT JOIN subscriptions subs ON subs.id = c.subscription_id
       LEFT JOIN users u ON u.id = subs.user_id
       LEFT JOIN wr.queue q ON q.subscription_id = c.subscription_id
       LEFT JOIN wr.sellers queue_creator ON queue_creator.seller_id = q.created_by
       ORDER BY c.claimed_at DESC
       LIMIT $1`,
      [limit]
    );

    const claimsWithTTS = claims.map((claim) => {
      const { user_created_at, subscription_created_at, ...rest } = claim;
      const tts =
        user_created_at && subscription_created_at
          ? calculateTTS(user_created_at, subscription_created_at)
          : null;

      return {
        ...rest,
        tts,
        subscription_created_at,
        queue_created_at: claim.queue_created_at,
        queue_created_by: claim.queue_created_by,
        queue_created_by_email: claim.queue_created_by_email,
        queue_is_manual: claim.queue_is_manual,
      };
    });

    return NextResponse.json(claimsWithTTS);
  } catch (error) {
    console.error('Recent claims error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent claims' },
      { status: 500 }
    );
  }
}
