// Win Room v2.0 - Sales payment submission API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/connection';
import { submitInstallmentPayment } from '@/lib/helpers/installments';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, ['sales', 'sales_lead', 'admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const paymentId = Number(params.id);
  if (Number.isNaN(paymentId)) {
    return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 });
  }

  try {
    const payment = await queryOne<{
      id: number;
      status: string;
      closer_seller_id: string | null;
    }>(
      `SELECT ip.id, ip.status, a.closer_seller_id
       FROM wr.installment_payments ip
       JOIN wr.installments inst ON inst.id = ip.installment_id
       LEFT JOIN wr.attribution a ON a.subscription_id = inst.subscription_id
       WHERE ip.id = $1`,
      [paymentId]
    );

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const role = auth.user.role;
    if (['sales', 'sales_lead'].includes(role) && payment.closer_seller_id !== auth.user.seller_id) {
      return NextResponse.json({ error: 'You are not allowed to update this payment' }, { status: 403 });
    }

    // Allow resubmission for pending, overdue, or rejected payments
    if (!['pending', 'overdue', 'rejected'].includes(payment.status)) {
      return NextResponse.json(
        { error: `Payments can only be submitted when status is 'pending', 'overdue', or 'rejected'. Current status: ${payment.status}` },
        { status: 400 }
      );
    }

    const body = await req.json();

    await submitInstallmentPayment(paymentId, auth.user.seller_id, {
      paid_amount: body?.paid_amount,
      payment_channel: body?.payment_channel,
      notes: body?.notes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit payment error:', error);
    const errorMsg = (error as any)?.message || '';

    if (errorMsg === 'PAYMENT_NOT_FOUND_OR_ACCESS_DENIED') {
      return NextResponse.json({ error: 'Payment not found or access denied' }, { status: 404 });
    }
    if (errorMsg.startsWith('PLAN_')) {
      const [, status] = errorMsg.split('_');
      return NextResponse.json({
        error: `Plan is ${status.toLowerCase()} - payment cannot be submitted`
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit payment' }, { status: 500 });
  }
}
