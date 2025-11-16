// Win Room v2.0 - Claim Adjustments Helper Functions
import { queryOne, query } from '../db/connection';

/**
 * Get adjusted metrics for a specific claim
 */
export async function getClaimAdjustedMetrics(claimId: number) {
  const result = await queryOne<any>(
    `SELECT
      claim_id,
      subscription_id,
      original_margin_usd,
      total_additional_cost_usd,
      adjusted_margin_usd,
      adjusted_margin_percent,
      adjustment_count,
      adjustment_reasons,
      last_adjusted_at
    FROM wr.claim_metrics_adjusted
    WHERE claim_id = $1`,
    [claimId]
  );

  return result;
}

/**
 * Get all adjustments for a claim
 */
export async function getClaimAdjustments(claimId: number) {
  const results = await query<any>(
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

  return results;
}

/**
 * Refresh materialized view (call after adjustments)
 */
export async function refreshAdjustedMetrics() {
  await query('REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted');
}
