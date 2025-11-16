// Win Room v2.0 - POST /api/objections
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { ObjectionRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  // Authenticate
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body: ObjectionRequest = await req.json();
    const { subscription_id, reason, details } = body;

    // Validate reason
    const validReasons = ['wrong_owner', 'duplicate', 'refund', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // Create objection
    const result = await query<any>(
      `INSERT INTO wr.objections (subscription_id, raised_by, reason, details)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [subscription_id, user.seller_id, reason, details || null]
    );

    const objectionId = result[0].id;

    // Create event
    await query(
      `INSERT INTO wr.events (type, subscription_id, actor, payload)
       VALUES ('objection.created', $1, $2, $3)`,
      [subscription_id, user.seller_id, JSON.stringify({ objection_id: objectionId, reason })]
    );

    return NextResponse.json({ success: true, objection_id: objectionId });
  } catch (error) {
    console.error('Objection creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
