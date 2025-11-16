// Win Room v2.0 - Claim Finance Approval API
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
}

// PATCH - Update finance status for a claim
export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
    const body: FinanceUpdateRequest = await req.json();
    const { finance_status, finance_notes } = body;

    // Validate finance_status
    const validStatuses = ['waiting', 'approved', 'installment', 'problem'];
    if (!validStatuses.includes(finance_status)) {
      return NextResponse.json(
        { error: `Invalid finance status. Must be one of: ${validStatuses.join(', ')}` },
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
    const result = await query<any>(
      `UPDATE wr.claims
       SET
         finance_status = $1::text,
         finance_approved_by = $2::text,
         finance_approved_at = NOW(),
         finance_notes = $3::text
       WHERE id = $4
       RETURNING id, subscription_id, claimed_by, finance_status, finance_approved_by, finance_approved_at, finance_notes`,
      [finance_status, user.seller_id, finance_notes || null, claimId]
    );

    // Refresh materialized view
    await query('REFRESH MATERIALIZED VIEW wr.claim_metrics_adjusted');

    return NextResponse.json({
      success: true,
      message: `Finance status updated to '${finance_status}'`,
      data: result[0],
    });
  } catch (error) {
    console.error('Claim finance update error:', error);
    return NextResponse.json({ error: 'Failed to update finance status' }, { status: 500 });
  }
}
