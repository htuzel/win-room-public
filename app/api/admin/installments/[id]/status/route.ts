// Win Room v2.0 - Installment status actions
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import {
  cancelInstallmentPlan,
  freezeInstallmentPlan,
  getInstallmentPlan,
  unfreezeInstallmentPlan,
} from '@/lib/helpers/installments';

export async function POST(
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
    const action = body?.action;
    const reason = body?.reason;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (action === 'freeze') {
      await freezeInstallmentPlan(planId, auth.user.seller_id, reason);
    } else if (action === 'unfreeze') {
      await unfreezeInstallmentPlan(planId, auth.user.seller_id);
    } else if (action === 'cancel') {
      await cancelInstallmentPlan(planId, auth.user.seller_id, reason);
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const plan = await getInstallmentPlan(planId);
    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Installment status update error:', error);
    return NextResponse.json({ error: 'Failed to update installment status' }, { status: 500 });
  }
}
