// Win Room v2.0 - Team chat API
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query, queryOne } from '@/lib/db/connection';
import type { ChatMessage } from '@/lib/types';

export async function GET(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100);

  const rows = await query<ChatMessage>(
    `SELECT c.id, c.seller_id, s.display_name, c.message, c.created_at
     FROM wr.chats c
     LEFT JOIN wr.sellers s ON s.seller_id = c.seller_id
     ORDER BY c.created_at DESC
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

  const { user } = authResult;

  try {
    const { message } = (await req.json()) as { message?: string };
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const trimmed = message.trim().slice(0, 300);
    const inserted = await queryOne<{ id: number }>(
      `INSERT INTO wr.chats (seller_id, message)
       VALUES ($1, $2)
       RETURNING id`,
      [user.seller_id, trimmed]
    );

    const chatRow = await queryOne<ChatMessage>(
      `SELECT c.id, c.seller_id, s.display_name, c.message, c.created_at
       FROM wr.chats c
       LEFT JOIN wr.sellers s ON s.seller_id = c.seller_id
       WHERE c.id = $1`,
      [inserted?.id]
    );

    if (chatRow) {
      await query(
        `INSERT INTO wr.events (type, actor, payload)
         VALUES ('chat.message', $1, $2)`,
        [user.seller_id, JSON.stringify(chatRow)]
      );
    }

    return NextResponse.json(chatRow, { status: 201 });
  } catch (error) {
    console.error('Chat message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
