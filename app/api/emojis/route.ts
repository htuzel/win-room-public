// Win Room v2.0 - Emoji reactions API
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query, queryOne } from '@/lib/db/connection';
import type { ReactionAggregate, ReactionTargetType } from '@/lib/types';

const ALLOWED_EMOJIS = ['🔥', '⚡', '🚀', '❤️', '👏'];
const ALLOWED_TARGETS: ReactionTargetType[] = ['queue', 'claim', 'badge'];

function parseTargetIds(param: string | null): number[] {
  if (!param) return [];
  return param
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

async function buildSummary(targetType: ReactionTargetType, targetIds: number[], sellerId: string) {
  if (!targetIds.length) return {} as Record<number, ReactionAggregate[]>;

  const rows = await query(
    `SELECT target_id, emoji, COUNT(*)::int AS count,
            BOOL_OR(seller_id = $3) AS reacted_by_me,
            json_agg(json_build_object('seller_id', seller_id, 'created_at', created_at) ORDER BY created_at DESC) AS users
     FROM wr.emojis
     WHERE target_type = $1 AND target_id = ANY($2::bigint[])
     GROUP BY target_id, emoji`,
    [targetType, targetIds, sellerId]
  );

  const grouped: Record<number, ReactionAggregate[]> = {};
  rows.forEach((row: any) => {
    const id = Number(row.target_id);
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push({
      emoji: row.emoji,
      count: Number(row.count),
      reacted_by_me: row.reacted_by_me,
      users: row.users || [],
    });
  });
  return grouped;
}

export async function GET(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('target_type') as ReactionTargetType | null;
  const targetIds = parseTargetIds(searchParams.get('target_ids'));

  if (!targetType || !ALLOWED_TARGETS.includes(targetType)) {
    return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
  }

  if (targetIds.length === 0) {
    return NextResponse.json({});
  }

  const summary = await buildSummary(targetType, targetIds, user.seller_id);
  return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { target_type, target_id, emoji } = (await req.json()) as {
      target_type: ReactionTargetType;
      target_id: number;
      emoji: string;
    };

    if (!ALLOWED_TARGETS.includes(target_type)) {
      return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
    }

    if (!target_id || !Number.isFinite(target_id)) {
      return NextResponse.json({ error: 'Invalid target_id' }, { status: 400 });
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Emoji not supported' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM wr.emojis
       WHERE target_type = $1 AND target_id = $2 AND emoji = $3 AND seller_id = $4`,
      [target_type, target_id, emoji, user.seller_id]
    );

    if (existing) {
      await query(`DELETE FROM wr.emojis WHERE id = $1`, [existing.id]);
      await query(
        `INSERT INTO wr.events (type, actor, payload)
         VALUES ('emoji.removed', $1, $2)`,
        [user.seller_id, JSON.stringify({ target_type, target_id, emoji, seller_id: user.seller_id })]
      );
    } else {
      await query(
        `INSERT INTO wr.emojis (target_type, target_id, emoji, seller_id)
         VALUES ($1, $2, $3, $4)`,
        [target_type, target_id, emoji, user.seller_id]
      );
      await query(
        `INSERT INTO wr.events (type, actor, payload)
         VALUES ('emoji.added', $1, $2)`,
        [user.seller_id, JSON.stringify({ target_type, target_id, emoji, seller_id: user.seller_id })]
      );
    }

    const summary = await buildSummary(target_type, [target_id], user.seller_id);
    return NextResponse.json({ summary: summary[target_id] || [] });
  } catch (error) {
    console.error('Emoji toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
