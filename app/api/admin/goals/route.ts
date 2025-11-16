// Win Room v2.0 - Admin Global Goals API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

const PERIOD_TYPES = new Set(['day', '15d', 'month']);
const TARGET_TYPES = new Set(['count', 'revenue', 'margin_amount']);
const VISIBILITY_SCOPES = new Set(['admin_only', 'sales_percent_only']);

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
  const periodFilter = searchParams.get('period_type');
  const visibilityFilter = searchParams.get('visibility_scope');

  const conditions: string[] = [];
  const values: any[] = [];

  if (periodFilter && PERIOD_TYPES.has(periodFilter)) {
    conditions.push(`period_type = $${values.length + 1}`);
    values.push(periodFilter);
  }

  if (visibilityFilter && VISIBILITY_SCOPES.has(visibilityFilter)) {
    conditions.push(`visibility_scope = $${values.length + 1}`);
    values.push(visibilityFilter);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const goals = await query(
    `
      SELECT id, period_type, period_start, period_end, target_type, target_value,
             visibility_scope, created_at, updated_at
      FROM wr.sales_goals
      ${whereClause}
      ORDER BY period_start DESC, id DESC
      LIMIT $${values.length + 1}
    `,
    [...values, limit]
  );

  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const {
      period_type,
      period_start,
      period_end,
      target_type,
      target_value,
      visibility_scope = 'sales_percent_only',
    } = body ?? {};

    if (!PERIOD_TYPES.has(period_type)) {
      return NextResponse.json({ error: 'Invalid period_type' }, { status: 400 });
    }

    if (!period_start || !period_end) {
      return NextResponse.json({ error: 'period_start and period_end required' }, { status: 400 });
    }

    if (!TARGET_TYPES.has(target_type)) {
      return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
    }

    const numericTarget = Number(target_value);
    if (!Number.isFinite(numericTarget)) {
      return NextResponse.json({ error: 'target_value must be numeric' }, { status: 400 });
    }

    if (!VISIBILITY_SCOPES.has(visibility_scope)) {
      return NextResponse.json({ error: 'Invalid visibility_scope' }, { status: 400 });
    }

    const rows = await query(
      `
        INSERT INTO wr.sales_goals
          (period_type, period_start, period_end, target_type, target_value, visibility_scope)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [period_type, period_start, period_end, target_type, numericTarget, visibility_scope]
    );

    return NextResponse.json({ success: true, id: rows[0]?.id });
  } catch (error) {
    console.error('Create sales goal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
