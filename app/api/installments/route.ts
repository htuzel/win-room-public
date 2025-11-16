// Win Room v2.0 - Public Installment API (sales + admin)
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import {
  createInstallmentPlan,
  CreateInstallmentPlanInput,
} from '@/lib/helpers/installments';

const ALLOWED_ROLES: Array<'sales' | 'sales_lead' | 'admin' | 'finance'> = [
  'sales',
  'sales_lead',
  'admin',
  'finance',
];

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, ALLOWED_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;

  try {
    const body = (await req.json()) as CreateInstallmentPlanInput;

    if (!body.subscription_id || !body.total_installments || !body.payments?.length) {
      return NextResponse.json(
        { error: 'subscription_id, total_installments and payments are required' },
        { status: 400 }
      );
    }

    if (body.payments.length !== body.total_installments) {
      return NextResponse.json(
        { error: 'Payments count must match total_installments' },
        { status: 400 }
      );
    }

    const planId = await createInstallmentPlan(
      {
        subscription_id: body.subscription_id,
        claim_id: body.claim_id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        total_amount: body.total_amount,
        currency: body.currency,
        total_installments: body.total_installments,
        default_interval_days: body.default_interval_days,
        payments: body.payments,
        notes: body.notes,
      },
      user.seller_id
    );

    return NextResponse.json({ success: true, plan_id: planId });
  } catch (error: any) {
    console.error('Installment create (public) error:', error);
    if (error?.code === 'INSTALLMENT_PLAN_EXISTS') {
      return NextResponse.json(
        { error: 'Installment plan already exists for this subscription' },
        { status: 409 }
      );
    }
    if (error?.message === 'INSTALLMENT_PAYMENTS_REQUIRED') {
      return NextResponse.json({ error: 'Payment schedule is required' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 });
  }
}
