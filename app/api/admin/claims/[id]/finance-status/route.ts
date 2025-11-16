// Win Room v2.0 - Finance Status Update API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { queryOne } from '@/lib/db/connection';
import { FinanceStatus } from '@/lib/types';
import { refreshAdjustedMetrics } from '@/lib/helpers/adjustments';

interface FinanceStatusUpdateRequest {
  finance_status: FinanceStatus;
  finance_notes?: string;
  installment_count?: number;
  installment_plan_id?: number;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin, finance, or sales team lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const claimId = parseInt(params.id);

  if (isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
  }

  try {
    const body: FinanceStatusUpdateRequest = await req.json();
    const { finance_status, finance_notes, installment_count, installment_plan_id } = body;

    // Validate finance_status
    const validStatuses: FinanceStatus[] = ['waiting', 'approved', 'installment', 'problem'];
    if (!validStatuses.includes(finance_status)) {
      return NextResponse.json(
        { error: 'Invalid finance status. Must be: waiting, approved, installment, or problem' },
        { status: 400 }
      );
    }

    // CRITICAL: If status is installment, plan_id is required
    if (finance_status === 'installment' && !installment_plan_id) {
      return NextResponse.json(
        { error: 'Installment status requires a linked installment plan. Please create the plan first.' },
        { status: 400 }
      );
    }

    // Check if claim exists
    const claim = await queryOne<any>(
      `SELECT id, subscription_id, claimed_by, finance_status
       FROM wr.claims
       WHERE id = $1`,
      [claimId]
    );

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Update finance status
    const updated = await queryOne<any>(
      `UPDATE wr.claims
       SET
         finance_status = $1,
         finance_approved_by = $2,
         finance_approved_at = NOW(),
         finance_notes = $3,
         installment_count = COALESCE($5, installment_count),
         installment_plan_id = COALESCE($6, installment_plan_id)
       WHERE id = $4
       RETURNING id, subscription_id, finance_status, finance_approved_by, finance_approved_at, finance_notes, installment_count, installment_plan_id`,
      [
        finance_status,
        user.seller_id,
        finance_notes || null,
        claimId,
        typeof installment_count === 'number' ? Math.max(0, installment_count) : null,
        installment_plan_id || null,
      ]
    );

    // Refresh materialized view to reflect new status
    await refreshAdjustedMetrics();

    return NextResponse.json({
      success: true,
      claim: updated,
    });
  } catch (error) {
    console.error('Finance status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
