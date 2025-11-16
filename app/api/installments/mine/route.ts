// Win Room v2.0 - Sales view of own installments
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { getInstallmentPlan } from '@/lib/helpers/installments';

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, ['sales', 'sales_lead', 'admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query(
      `SELECT i.*
       FROM wr.installments i
       JOIN wr.attribution a ON a.subscription_id = i.subscription_id
       WHERE a.closer_seller_id = $1
       ORDER BY i.updated_at DESC`,
      [auth.user.seller_id]
    );

    const plans = [];
    for (const row of rows) {
      const plan = await getInstallmentPlan(row.id);
      if (plan) {
        plans.push(plan);
      }
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Get my installments error:', error);
    return NextResponse.json({ error: 'Failed to fetch installments' }, { status: 500 });
  }
}
