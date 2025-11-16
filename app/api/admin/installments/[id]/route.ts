// Win Room v2.0 - Installment detail API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { getInstallmentPlan } from '@/lib/helpers/installments';
import { query } from '@/lib/db/connection';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (auth instanceof NextResponse) return auth;

  const planId = Number(params.id);
  if (Number.isNaN(planId)) {
    return NextResponse.json({ error: 'Invalid installment id' }, { status: 400 });
  }

  try {
    const plan = await getInstallmentPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Get installment error:', error);
    return NextResponse.json({ error: 'Failed to fetch installment' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const planId = Number(params.id);
  if (Number.isNaN(planId)) {
    return NextResponse.json({ error: 'Invalid installment id' }, { status: 400 });
  }

  try {
    const body = await req.json();

    await query(
      `UPDATE wr.installments
       SET customer_name = COALESCE($1, customer_name),
           customer_email = COALESCE($2, customer_email),
           total_amount = COALESCE($3, total_amount),
           currency = COALESCE($4, currency),
           notes = $5,
           updated_at = NOW(),
           updated_by = $6
       WHERE id = $7`,
      [
        body.customer_name || null,
        body.customer_email || null,
        body.total_amount || null,
        body.currency || null,
        body.notes || null,
        auth.user.seller_id,
        planId,
      ]
    );

    const plan = await getInstallmentPlan(planId);

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Update installment meta error:', error);
    return NextResponse.json({ error: 'Failed to update installment' }, { status: 500 });
  }
}
