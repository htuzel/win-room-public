// Win Room v2.0 - Installment dashboard summary
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/connection';

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (auth instanceof NextResponse) return auth;

  try {
    const summary = await queryOne(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') AS total_active,
         COUNT(*) FILTER (WHERE status = 'frozen') AS total_frozen,
         COUNT(*) FILTER (WHERE status = 'completed') AS total_completed,
         (
           SELECT COUNT(*) FROM wr.installment_payments
           WHERE status = 'submitted'
         ) AS review_needed,
         (
           SELECT COUNT(*) FROM wr.installment_payments
           WHERE status IN ('pending','overdue')
             AND due_date < CURRENT_DATE
             AND (tolerance_until IS NULL OR tolerance_until < CURRENT_DATE)
         ) AS overdue,
         (
           SELECT COUNT(*) FROM wr.installment_payments
           WHERE tolerance_until IS NOT NULL
             AND tolerance_until >= CURRENT_DATE
         ) AS tolerance_active
       FROM wr.installments`
    );

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Installment dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
