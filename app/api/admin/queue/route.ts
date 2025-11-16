// Win Room v2.0 - Admin Queue Management API
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/connection';
import { requireRoles } from '@/lib/auth/middleware';

// GET - Fetch all pending queue items for admin/finance/sales lead
export async function GET(req: NextRequest) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Get total count
    const countResult = await query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM wr.queue q
      WHERE q.status IN ('pending', 'excluded')
    `);
    const totalCount = parseInt(countResult[0]?.count || '0');

    // Get paginated items
    const items = await query<any>(`
      SELECT
        q.id,
        q.subscription_id,
        q.created_at,
        q.status,
        q.created_by,
        (q.created_by IS NOT NULL) AS is_manual,
        q.finance_status,
        q.finance_approved_by,
        q.finance_approved_at,
        q.finance_notes,
        q.installment_plan_id,
        q.installment_count,
        u.email as customer_email,
        u.name as customer_name,
        u.is_kid as is_kid_account,
        subs.created_at as subscription_created_at,
        subs.payment_channel,
        -- Use payment_infos amount if subs_amount is null/0
        COALESCE(
          NULLIF(subs.subs_amount, 0),
          pi."paidPrice"
        ) as subs_amount,
        COALESCE(
          NULLIF(subs.currency, ''),
          pi.currency
        ) as currency,
        c.campaign_name,
        sm.revenue_usd,
        sm.cost_usd,
        sm.margin_amount_usd,
        sm.margin_percent,
        creator.display_name AS created_by_name,
        creator.email AS created_by_email
      FROM wr.queue q
      LEFT JOIN subscriptions subs ON subs.id = q.subscription_id
      LEFT JOIN users u ON u.id = subs.user_id
      LEFT JOIN campaigns c ON c.id = subs.campaign_id
      LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = q.subscription_id
      LEFT JOIN payment_conversations pc ON pc.subscription_id = q.subscription_id
      LEFT JOIN payment_infos pi ON pi.id = pc.paymentinfo_id
      LEFT JOIN wr.sellers creator ON creator.seller_id = q.created_by
      WHERE q.status IN ('pending', 'excluded')
      ORDER BY q.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return NextResponse.json({
      items,
      pagination: {
        limit,
        offset,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1,
      }
    });
  } catch (error) {
    console.error('Admin queue fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}

// DELETE - Clear all pending queue items
export async function DELETE(req: NextRequest) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const result = await query<any>(`
      DELETE FROM wr.queue
      WHERE status = 'pending'
      RETURNING id
    `);

    return NextResponse.json({
      success: true,
      deleted_count: result.length,
      message: `Successfully cleared ${result.length} queue items`
    });
  } catch (error) {
    console.error('Admin queue clear error:', error);
    return NextResponse.json({ error: 'Failed to clear queue' }, { status: 500 });
  }
}
