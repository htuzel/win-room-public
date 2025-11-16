// Win Room v2.0 - Admin Global Goal detail API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

const PERIOD_TYPES = new Set(['day', '15d', 'month']);
const TARGET_TYPES = new Set(['count', 'revenue', 'margin_amount']);
const VISIBILITY_SCOPES = new Set(['admin_only', 'sales_percent_only']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const goalId = parseInt(params.id, 10);
  if (!Number.isFinite(goalId)) {
    return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const fields: string[] = [];
    const values: any[] = [];

    if (body.period_type) {
      if (!PERIOD_TYPES.has(body.period_type)) {
        return NextResponse.json({ error: 'Invalid period_type' }, { status: 400 });
      }
      fields.push(`period_type = $${fields.length + 1}`);
      values.push(body.period_type);
    }

    if (body.period_start) {
      fields.push(`period_start = $${fields.length + 1}`);
      values.push(body.period_start);
    }

    if (body.period_end) {
      fields.push(`period_end = $${fields.length + 1}`);
      values.push(body.period_end);
    }

    if (body.target_type) {
      if (!TARGET_TYPES.has(body.target_type)) {
        return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
      }
      fields.push(`target_type = $${fields.length + 1}`);
      values.push(body.target_type);
    }

    if (body.target_value !== undefined) {
      const numericTarget = Number(body.target_value);
      if (!Number.isFinite(numericTarget)) {
        return NextResponse.json({ error: 'target_value must be numeric' }, { status: 400 });
      }
      fields.push(`target_value = $${fields.length + 1}`);
      values.push(numericTarget);
    }

    if (body.visibility_scope) {
      if (!VISIBILITY_SCOPES.has(body.visibility_scope)) {
        return NextResponse.json({ error: 'Invalid visibility_scope' }, { status: 400 });
      }
      fields.push(`visibility_scope = $${fields.length + 1}`);
      values.push(body.visibility_scope);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const sql = `
      UPDATE wr.sales_goals
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
    `;

    await query(sql, [...values, goalId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update sales goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const goalId = parseInt(params.id, 10);
  if (!Number.isFinite(goalId)) {
    return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });
  }

  try {
    await query('DELETE FROM wr.sales_goals WHERE id = $1', [goalId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete sales goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
