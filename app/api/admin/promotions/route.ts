// Win Room v2.0 - Admin Promotions API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/connection';
import { verifyToken } from '@/lib/auth/jwt';

// GET /api/admin/promotions - Get all promotions (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'finance', 'sales_lead'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const promotions = await query(`
      SELECT * FROM wr.promotions
      ORDER BY created_at DESC
    `);

    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Get promotions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/promotions - Create new promotion (admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'finance', 'sales_lead'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, variant, icon, visible } = body;

    // Validation
    if (!title || !message || !variant) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['promo', 'info', 'success', 'warning'].includes(variant)) {
      return NextResponse.json({ error: 'Invalid variant' }, { status: 400 });
    }

    const result = await queryOne<{ id: number }>(`
      INSERT INTO wr.promotions (title, message, variant, icon, visible, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [title, message, variant, icon || '🎯', visible !== undefined ? visible : true, decoded.seller_id]);

    return NextResponse.json({ success: true, id: result?.id });
  } catch (error) {
    console.error('Create promotion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/promotions - Update promotion
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !['admin', 'finance', 'sales_lead'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, message, variant, icon, visible } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing promotion ID' }, { status: 400 });
    }

    await query(`
      UPDATE wr.promotions
      SET title = COALESCE($1, title),
          message = COALESCE($2, message),
          variant = COALESCE($3, variant),
          icon = COALESCE($4, icon),
          visible = COALESCE($5, visible),
          updated_at = NOW()
      WHERE id = $6
    `, [title, message, variant, icon, visible, id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update promotion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
