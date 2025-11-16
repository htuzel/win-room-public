// Win Room v2.0 - POST/DELETE /api/admin/claims/:id/adjustment
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { transaction, query, queryOne } from '@/lib/db/connection';
import { ClaimAdjustmentRequest } from '@/lib/types';

// POST - Add or update adjustment
export async function POST(
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
    return NextResponse.json(
      { error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  try {
    const body: ClaimAdjustmentRequest = await req.json();
    const { additional_cost_usd, reason, notes } = body;

    // Validation
    if (additional_cost_usd === undefined || additional_cost_usd < 0) {
      return NextResponse.json(
        { error: 'additional_cost_usd must be >= 0' },
        { status: 400 }
      );
    }

    const validReasons = ['commission', 'partial_refund', 'chargeback', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid adjustment reason' },
        { status: 400 }
      );
    }

    await transaction(async (client) => {
      // Get claim details
      const claim = await client.query(
        `SELECT subscription_id FROM wr.claims WHERE id = $1`,
        [claimId]
      );

      if (claim.rows.length === 0) {
        throw new Error('Claim not found');
      }

      const subscriptionId = claim.rows[0].subscription_id;

      // Get original margin to validate adjustment doesn't exceed margin
      const metrics = await client.query(
        `SELECT margin_amount_usd FROM wr.subscription_metrics WHERE subscription_id = $1`,
        [subscriptionId]
      );

      if (metrics.rows.length === 0) {
        throw new Error('Metrics not found for this subscription');
      }

      const originalMargin = parseFloat(metrics.rows[0].margin_amount_usd || '0');

      // Get existing adjustments total
      const existingAdj = await client.query(
        `SELECT COALESCE(SUM(additional_cost_usd), 0) as total
         FROM wr.claim_adjustments
         WHERE claim_id = $1`,
        [claimId]
      );

      const existingTotal = parseFloat(existingAdj.rows[0].total || '0');
      const newTotal = existingTotal + additional_cost_usd;

      // Validate: total adjustments shouldn't exceed original margin
      if (newTotal > originalMargin) {
        throw new Error(
          `Total adjustments ($${newTotal.toFixed(2)}) cannot exceed original margin ($${originalMargin.toFixed(2)})`
        );
      }

      // Insert adjustment
      await client.query(
        `INSERT INTO wr.claim_adjustments
         (subscription_id, claim_id, additional_cost_usd, reason, notes, adjusted_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [subscriptionId, claimId, additional_cost_usd, reason, notes || null, user.seller_id]
      );

      // Refresh materialized view
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted');

      // Event is created by trigger automatically (wr.notify_adjustment_change)
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Adjustment error:', error);

    if (error.message === 'Claim not found') {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    if (error.message?.includes('cannot exceed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove all adjustments for a claim
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin, finance, or sales team lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const claimId = parseInt(params.id);

  if (isNaN(claimId)) {
    return NextResponse.json(
      { error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  try {
    await transaction(async (client) => {
      // Check if claim exists
      const claim = await client.query(
        'SELECT id FROM wr.claims WHERE id = $1',
        [claimId]
      );

      if (claim.rows.length === 0) {
        throw new Error('Claim not found');
      }

      // Delete all adjustments for this claim
      await client.query(
        'DELETE FROM wr.claim_adjustments WHERE claim_id = $1',
        [claimId]
      );

      // Refresh materialized view
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted');
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete adjustment error:', error);

    if (error.message === 'Claim not found') {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get all adjustments for a claim
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Require admin, finance, or sales team lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const claimId = parseInt(params.id);

  if (isNaN(claimId)) {
    return NextResponse.json(
      { error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  try {
    const adjustments = await query(
      `SELECT
        ca.id,
        ca.subscription_id,
        ca.claim_id,
        ca.additional_cost_usd,
        ca.reason,
        ca.notes,
        ca.adjusted_by,
        ca.created_at,
        s.display_name as adjusted_by_name
      FROM wr.claim_adjustments ca
      LEFT JOIN wr.sellers s ON s.seller_id = ca.adjusted_by
      WHERE ca.claim_id = $1
      ORDER BY ca.created_at DESC`,
      [claimId]
    );

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Get adjustments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
