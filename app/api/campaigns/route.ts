// Win Room v2.0 - Campaigns API
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

const ALLOWED_ROLES = new Set(['sales', 'sales_lead', 'admin', 'finance']);

export async function GET(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  if (!ALLOWED_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const campaigns = await query<{ campaign_name: string }>(
      `SELECT DISTINCT campaign_name
       FROM campaigns
       WHERE campaign_name IS NOT NULL
       ORDER BY campaign_name ASC`
    );

    const campaignNames = campaigns.map((row) => row.campaign_name);

    return NextResponse.json({
      success: true,
      campaigns: campaignNames,
    });
  } catch (error) {
    console.error('[Campaigns API] Failed to fetch campaigns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
