// Win Room v2.0 - Installment collection API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import {
  createInstallmentPlan,
  CreateInstallmentPlanInput,
  getInstallmentPayments,
  listInstallmentPlans,
} from '@/lib/helpers/installments';

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const subscriptionId = parseNumber(searchParams.get('subscription_id'));
  const claimId = parseNumber(searchParams.get('claim_id'));
  const search = searchParams.get('search') || undefined;
  const includePayments = searchParams.get('includePayments') === 'true';

  try {
    const plans = await listInstallmentPlans({
      status: status as any,
      subscription_id: subscriptionId,
      claim_id: claimId,
      search,
    });

    if (includePayments) {
      for (const plan of plans) {
        plan.payments = await getInstallmentPayments(plan.id);
      }
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('List installments error:', error);
    return NextResponse.json({ error: 'Failed to fetch installment plans' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;

  try {
    const body = (await req.json()) as CreateInstallmentPlanInput & {
      first_due_date?: string;
      interval_days?: number;
    };

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
        default_interval_days: body.default_interval_days || body.interval_days,
        payments: body.payments,
        notes: body.notes,
      },
      user.seller_id
    );

    return NextResponse.json({ success: true, plan_id: planId });
  } catch (error: any) {
    console.error('Create installment error:', error);
    if (error?.code === 'INSTALLMENT_PLAN_EXISTS' || error?.message === 'INSTALLMENT_PLAN_EXISTS') {
      return NextResponse.json({ error: 'Installment plan already exists for this subscription' }, { status: 409 });
    }
    if (error?.message === 'INSTALLMENT_PAYMENTS_REQUIRED') {
      return NextResponse.json({ error: 'Payment schedule is required' }, { status: 400 });
    }
    if (error?.message === 'PAYMENT_NUMBERS_MUST_BE_SEQUENTIAL') {
      return NextResponse.json({ error: 'Taksit numaraları 1\'den N\'e sıralı olmalıdır' }, { status: 400 });
    }
    if (error?.code === '23505') {
      // PostgreSQL unique violation
      return NextResponse.json({ error: 'Bu subscription için zaten bir taksit planı var' }, { status: 409 });
    }
    if (error?.code === '23503') {
      // PostgreSQL foreign key violation
      return NextResponse.json({ error: 'Geçersiz subscription_id' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create installment plan' }, { status: 500 });
  }
}
