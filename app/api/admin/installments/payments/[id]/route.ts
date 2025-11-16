// Win Room v2.0 - Admin payment actions
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import {
  addToleranceToPayment,
  confirmInstallmentPayment,
  rejectInstallmentPayment,
  updatePaymentNotes,
} from '@/lib/helpers/installments';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRoles(req, ['admin', 'finance']);
  if (auth instanceof NextResponse) return auth;

  const paymentId = Number(params.id);
  if (Number.isNaN(paymentId)) {
    return NextResponse.json({ error: 'Invalid payment id' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'confirm') {
      await confirmInstallmentPayment(paymentId, auth.user.seller_id, {
        paid_amount: body.paid_amount,
        payment_channel: body.payment_channel,
      });
    } else if (action === 'reject') {
      if (!body.reason) {
        return NextResponse.json({ error: 'reason is required to reject' }, { status: 400 });
      }
      await rejectInstallmentPayment(paymentId, auth.user.seller_id, body.reason);
    } else if (action === 'tolerance') {
      if (!body.tolerance_until) {
        return NextResponse.json({ error: 'tolerance_until is required' }, { status: 400 });
      }
      await addToleranceToPayment(paymentId, auth.user.seller_id, {
        tolerance_until: body.tolerance_until,
        tolerance_reason: body.tolerance_reason || 'Tolerance granted',
      });
    } else if (action === 'note') {
      await updatePaymentNotes(paymentId, auth.user.seller_id, body.note || '');
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment action error:', error);
    const errorMsg = (error as any)?.message || '';

    if (errorMsg === 'PAYMENT_NOT_FOUND_OR_ACCESS_DENIED') {
      return NextResponse.json({ error: 'Payment not found or access denied' }, { status: 404 });
    }
    if (errorMsg === 'PAYMENT_NOT_FOUND') {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (errorMsg.startsWith('PLAN_')) {
      // PLAN_FROZEN_CANNOT_CONFIRM, PLAN_CANCELLED_CANNOT_SUBMIT, etc.
      const [, status, action] = errorMsg.split('_');
      return NextResponse.json({
        error: `Plan ${status.toLowerCase()} durumunda - işlem yapılamaz`
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
