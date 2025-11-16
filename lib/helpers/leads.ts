// Win Room v2.0 - Lead aggregation helpers
import { query } from '../db/connection';

export interface LeadTotalRow {
  seller_id: string | null;
  lead_count: number;
}

interface LeadTotalsOptions {
  startDate?: string;
  endDate?: string;
  sellerIds?: string[];
  requireSellerId?: boolean;
}

function buildLeadQuery(options: LeadTotalsOptions) {
  const clauses: string[] = [];
  const params: (string | string[])[] = [];

  if (options.startDate) {
    params.push(options.startDate);
    clauses.push(`assignment_date >= $${params.length}::date`);
  }

  if (options.endDate) {
    params.push(options.endDate);
    clauses.push(`assignment_date <= $${params.length}::date`);
  }

  if (options.sellerIds?.length) {
    params.push(options.sellerIds);
    clauses.push(`seller_id = ANY($${params.length}::text[])`);
  }

  if (options.requireSellerId !== false) {
    clauses.push('seller_id IS NOT NULL');
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereClause, params };
}

export async function getLeadTotals(options: LeadTotalsOptions = {}) {
  const { whereClause, params } = buildLeadQuery(options);
  const rows = await query<LeadTotalRow>(
    `SELECT seller_id, SUM(lead_count) AS lead_count
     FROM wr.lead_assignments_daily
     ${whereClause}
     GROUP BY seller_id`,
    params
  );

  return rows.map((row) => ({
    seller_id: row.seller_id,
    lead_count: Number(row.lead_count || 0),
  }));
}

export async function getLeadTotalsMap(options: LeadTotalsOptions = {}) {
  const rows = await getLeadTotals(options);
  return rows.reduce<Map<string, number>>((map, row) => {
    if (row.seller_id) {
      map.set(row.seller_id, row.lead_count);
    }
    return map;
  }, new Map());
}

export async function getLeadSum(options: LeadTotalsOptions = {}) {
  const rows = await getLeadTotals(options);
  return rows.reduce((sum, row) => sum + row.lead_count, 0);
}
