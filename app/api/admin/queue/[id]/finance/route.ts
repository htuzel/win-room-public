// Win Room v2.0 - Queue Finance Approval API
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db/connection';
import { requireRoles } from '@/lib/auth/middleware';

interface RouteParams {
  params: {
    id: string;
  };
}

interface FinanceUpdateRequest {
  finance_status: 'waiting' | 'approved' | 'installment' | 'problem';
  finance_notes?: string;
  installment_count?: number;
  installment_plan_id?: number;
}

// PATCH - Update finance status for a queue item
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const queueId = parseInt(params.id);

  if (isNaN(queueId)) {
    return NextResponse.json({ error: 'Invalid queue ID' }, { status: 400 });
  }

  try {
    const body: FinanceUpdateRequest = await req.json();
    const { finance_status, finance_notes, installment_count, installment_plan_id } = body;

    // Validate finance_status
    const validStatuses = ['waiting', 'approved', 'installment', 'problem'];
    if (!validStatuses.includes(finance_status)) {
      return NextResponse.json(
        { error: `Invalid finance status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // CRITICAL: If status is installment, plan_id is required
    if (finance_status === 'installment' && !installment_plan_id) {
      return NextResponse.json(
        { error: 'Taksit durumu için bir taksit planı ilişkilendirilmelidir. Lütfen önce taksit planı oluşturun.' },
        { status: 400 }
      );
    }

    // Check if queue item exists
    const queueItem = await queryOne<any>(
      `SELECT id, subscription_id, status, finance_status
       FROM wr.queue
       WHERE id = $1`,
      [queueId]
    );

    if (!queueItem) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    // Update finance status
    const result = await query<any>(
      `UPDATE wr.queue
       SET
         finance_status = $1::text,
         finance_approved_by = $2::text,
         finance_approved_at = NOW(),
         finance_notes = $3::text,
         installment_count = COALESCE($5, installment_count),
         installment_plan_id = COALESCE($6, installment_plan_id)
       WHERE id = $4
       RETURNING id, subscription_id, finance_status, finance_approved_by, finance_approved_at, finance_notes, installment_count, installment_plan_id`,
      [
        finance_status,
        user.seller_id,
        finance_notes || null,
        queueId,
        typeof installment_count === 'number' ? Math.max(0, installment_count) : null,
        installment_plan_id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Finance status updated to '${finance_status}'`,
      data: result[0],
    });
  } catch (error) {
    console.error('Queue finance update error:', error);
    return NextResponse.json({ error: 'Failed to update finance status' }, { status: 500 });
  }
}
