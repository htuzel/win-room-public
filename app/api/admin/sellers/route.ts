// Win Room v2.0 - GET /api/admin/sellers (List all sellers)
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';

interface SellerRow {
  seller_id: string;
  display_name: string;
  email: string | null;
  role: string | null;
  pipedrive_owner_id: string | null;
  is_active: boolean;
  total_sales: string | number | null;
  total_revenue_usd: string | number | null;
  total_cost_usd: string | number | null;
  total_margin_usd: string | number | null;
  avg_margin_percent: string | number | null;
  total_leads: string | number | null;
  total_wins: string | number | null;
  conversion_rate: string | number | null;
  campaigns: string | null;
}

export async function GET(req: NextRequest) {
  // Allow admin and sales_lead roles to view sellers for dropdowns
  const authResult = await requireRoles(req, ['admin', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const filter = searchParams.get('filter') || 'all'; // all, active, inactive
    const offset = (page - 1) * limit;

    // Build WHERE clause based on filter
    let filterClause = "WHERE 1=1"; // Show all users including admin, finance, sales_lead
    if (filter === 'active') {
      filterClause += " AND s.is_active = true";
    } else if (filter === 'inactive') {
      filterClause += " AND s.is_active = false";
    }

    // Get total count
    const countResult = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT s.seller_id) as count
      FROM wr.sellers s
      ${filterClause}`
    );
    const totalCount = countResult[0]?.count || 0;

    // Get paginated sellers
    const rawSellers = await query<SellerRow>(
      `SELECT
        s.seller_id,
        s.display_name,
        s.email,
        s.role,
        s.pipedrive_owner_id,
        s.is_active,
        COALESCE(SUM(sa.share_percent), 0) as total_sales,
        COALESCE(SUM(sm.revenue_usd * sa.share_percent), 0) as total_revenue_usd,
        COALESCE(SUM(sm.cost_usd * sa.share_percent), 0) as total_cost_usd,
        COALESCE(SUM(sm.margin_amount_usd * sa.share_percent), 0) as total_margin_usd,
        COALESCE(
          SUM(sm.margin_percent * sa.share_percent) / NULLIF(SUM(sa.share_percent), 0),
          0
        ) as avg_margin_percent,
        COALESCE(MAX(la.total_leads), 0) as total_leads,
        COALESCE(MAX(w.total_wins), 0) as total_wins,
        CASE
          WHEN COALESCE(MAX(la.total_leads), 0) > 0
          THEN COALESCE(MAX(w.total_wins), 0)::float / COALESCE(MAX(la.total_leads), 1)
          ELSE 0
        END AS conversion_rate,
        STRING_AGG(DISTINCT c.campaign_name, ', ' ORDER BY c.campaign_name) as campaigns
      FROM wr.sellers s
      LEFT JOIN wr.attribution_share_entries sa ON sa.seller_id = s.seller_id
      LEFT JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
      LEFT JOIN subscriptions sub ON sub.id = a.subscription_id
      LEFT JOIN campaigns c ON c.id = sub.campaign_id
      LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = a.subscription_id
      LEFT JOIN (
        SELECT seller_id, SUM(lead_count) AS total_leads
        FROM wr.lead_assignments_daily
        WHERE seller_id IS NOT NULL
        GROUP BY seller_id
      ) la ON la.seller_id = s.seller_id
      LEFT JOIN (
        SELECT seller_id, SUM(share_percent) AS total_wins
        FROM wr.attribution_share_entries
        GROUP BY seller_id
      ) w ON w.seller_id = s.seller_id
      ${filterClause}
      GROUP BY s.seller_id, s.display_name, s.email, s.role, s.pipedrive_owner_id, s.is_active
      ORDER BY s.display_name ASC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const toNumber = (value: unknown) =>
      value === null || value === undefined ? null : Number(value);

    const sellers = rawSellers.map((seller) => ({
      ...seller,
      total_sales: toNumber(seller.total_sales) ?? 0,
      total_revenue_usd: toNumber(seller.total_revenue_usd) ?? 0,
      total_cost_usd: toNumber(seller.total_cost_usd) ?? 0,
      total_margin_usd: toNumber(seller.total_margin_usd) ?? 0,
      avg_margin_percent:
        seller.avg_margin_percent !== null && seller.avg_margin_percent !== undefined
          ? Number(seller.avg_margin_percent)
          : 0,
      total_leads: toNumber(seller.total_leads) ?? 0,
      total_wins: toNumber(seller.total_wins) ?? 0,
      conversion_rate:
        seller.conversion_rate !== null && seller.conversion_rate !== undefined
          ? Number(seller.conversion_rate)
          : 0,
    }));

    return NextResponse.json({
      sellers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Sellers fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
