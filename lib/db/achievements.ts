// Win Room v2.0 - Achievement persistence helpers
import type { PoolClient } from 'pg';
import { query } from './connection';
import type { AchievementBadge, AchievementType } from '@/lib/types';

type Executor = <T = any>(text: string, params?: any[]) => Promise<T[]>;

function getExecutor(client?: PoolClient): Executor {
  if (client) {
    return async <T>(text: string, params?: any[]) => {
      const result = await client.query(text, params);
      return result.rows as T[];
    };
  }

  return query;
}

export interface InsertAchievementInput {
  client?: PoolClient;
  eventId?: number | null;
  type: AchievementType;
  sellerId?: string | null;
  title: string;
  description?: string | null;
  payload?: Record<string, any> | null;
  dedupeKey?: string | null;
}

function normalizeRow(row: any): AchievementBadge {
  let payload: Record<string, any> | null = null;
  if (row?.payload != null) {
    if (typeof row.payload === 'string') {
      try {
        payload = JSON.parse(row.payload);
      } catch {
        payload = { raw: row.payload };
      }
    } else {
      payload = row.payload;
    }
  }

  return {
    id: row.id,
    type: row.type,
    seller_id: row.seller_id ?? undefined,
    title: row.title,
    description: row.description ?? '',
    payload,
    dedupe_key: row.dedupe_key ?? undefined,
    created_at: row.created_at,
  };
}

async function findByDedupe(exec: Executor, dedupeKey: string): Promise<AchievementBadge | null> {
  const rows = await exec(
    `SELECT id, type, seller_id, title, description, payload, dedupe_key, created_at
     FROM wr.achievements
     WHERE dedupe_key = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [dedupeKey]
  );
  if (!rows.length) {
    return null;
  }
  return normalizeRow(rows[0]);
}

export async function insertAchievement({
  client,
  eventId = null,
  type,
  sellerId,
  title,
  description,
  payload,
  dedupeKey,
}: InsertAchievementInput): Promise<AchievementBadge> {
  const exec = getExecutor(client);

  // Check for existing achievement BEFORE emitting event
  if (dedupeKey) {
    const existing = await findByDedupe(exec, dedupeKey);
    if (existing) {
      // Achievement already exists, return it without emitting new event
      return existing;
    }
  }

  // Only emit event if this is a NEW achievement
  let effectiveEventId = eventId;
  if (!effectiveEventId) {
    try {
      const eventRows = await exec<{ id: number }>(
        `INSERT INTO wr.events (type, actor, payload)
         VALUES ('achievement.created', $1, $2)
         RETURNING id`,
        [
          sellerId || 'team',
          JSON.stringify({
            achievement_type: type,
            seller_id: sellerId ?? null,
            title,
            description,
            celebration: payload?.celebration ?? null,
            data: payload ?? null,
          }),
        ]
      );
      effectiveEventId = eventRows[0]?.id ?? null;
    } catch (eventError) {
      console.warn('[Achievements] Failed to emit achievement event:', eventError);
    }
  }

  const rows = await exec(
    `INSERT INTO wr.achievements (event_id, type, seller_id, title, description, payload, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING id, type, seller_id, title, description, payload, dedupe_key, created_at`,
    [
      effectiveEventId,
      type,
      sellerId || null,
      title,
      description || null,
      payload ? JSON.stringify(payload) : null,
      dedupeKey || null,
    ]
  );

  if (rows.length > 0) {
    return normalizeRow(rows[0]);
  }

  if (dedupeKey) {
    const existing = await findByDedupe(exec, dedupeKey);
    if (existing) {
      return existing;
    }
  }

  throw new Error('Failed to insert achievement');
}
