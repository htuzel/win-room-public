// Win Room v2.0 - GET/POST /api/achievements
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { insertAchievement } from '@/lib/db/achievements';
import type { AchievementBadge, AchievementType } from '@/lib/types';

const ALLOWED_TYPES: AchievementType[] = [
  'streak',
  'jackpot',
  'personal_goal',
  'team_goal',
  'daily_revenue',
  'personal_revenue_4k',
  'personal_revenue_8k',
  'personal_revenue_10k',
  'team_revenue_30k',
  'team_revenue_40k',
];

export async function GET(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10) || 12, 1), 50);

  const rows = await query<AchievementBadge>(
    `SELECT id, type, seller_id, title, description, payload, created_at
     FROM wr.achievements
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { user } = authResult;
    const body = await req.json();
    const { type, title, description, seller_id, payload, dedupe_key } = body as {
      type: AchievementType;
      title?: string;
      description?: string;
      seller_id?: string;
      payload?: Record<string, any>;
      dedupe_key?: string;
    };

    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid achievement type' }, { status: 400 });
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // For team achievements, use NULL for seller_id
    const isTeamAchievement =
      type === 'team_goal' ||
      type === 'daily_revenue' ||
      type === 'team_revenue_30k' ||
      type === 'team_revenue_40k';
    const finalSellerId = isTeamAchievement ? null : (seller_id || user.seller_id);

    const achievement = await insertAchievement({
      type,
      sellerId: finalSellerId,
      title,
      description,
      payload,
      dedupeKey: dedupe_key,
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch (error) {
    console.error('[API] Achievement create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
