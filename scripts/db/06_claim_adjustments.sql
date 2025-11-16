-- Win Room v2.0 - Claim Adjustments Feature
-- Additional costs tracking (commission, partial refunds, chargebacks)
-- IMPORTANT: Review before running!

SET search_path TO wr, public;

-- =====================================================================
-- 1. CREATE CLAIM ADJUSTMENTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS wr.claim_adjustments (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  claim_id BIGINT NOT NULL,
  additional_cost_usd NUMERIC NOT NULL CHECK (additional_cost_usd >= 0),
  reason TEXT NOT NULL CHECK (reason IN ('commission', 'partial_refund', 'chargeback', 'other')),
  notes TEXT NULL,
  adjusted_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Foreign key constraints
  CONSTRAINT fk_claim_adjustments_claim
    FOREIGN KEY (claim_id) REFERENCES wr.claims(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_claim ON wr.claim_adjustments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_sub ON wr.claim_adjustments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_date ON wr.claim_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_adjusted_by ON wr.claim_adjustments(adjusted_by);

-- Comments
COMMENT ON TABLE wr.claim_adjustments IS 'Additional costs applied to claims (commissions, partial refunds, chargebacks)';
COMMENT ON COLUMN wr.claim_adjustments.additional_cost_usd IS 'Additional cost in USD that reduces the margin';
COMMENT ON COLUMN wr.claim_adjustments.reason IS 'Type of adjustment: commission, partial_refund, chargeback, other';
COMMENT ON COLUMN wr.claim_adjustments.adjusted_by IS 'seller_id of admin who made the adjustment';

-- =====================================================================
-- 2. CREATE VIEW FOR LATEST ADJUSTMENT PER CLAIM
-- =====================================================================
CREATE OR REPLACE VIEW wr.claim_adjustments_latest AS
SELECT DISTINCT ON (claim_id)
  id,
  subscription_id,
  claim_id,
  additional_cost_usd,
  reason,
  notes,
  adjusted_by,
  created_at
FROM wr.claim_adjustments
ORDER BY claim_id, created_at DESC;

COMMENT ON VIEW wr.claim_adjustments_latest IS 'Latest adjustment per claim (most recent only)';

-- =====================================================================
-- 3. CREATE VIEW FOR TOTAL ADJUSTMENTS PER CLAIM
-- =====================================================================
CREATE OR REPLACE VIEW wr.claim_adjustments_total AS
SELECT
  claim_id,
  subscription_id,
  SUM(additional_cost_usd) as total_additional_cost_usd,
  COUNT(*) as adjustment_count,
  MAX(created_at) as last_adjusted_at,
  STRING_AGG(DISTINCT reason, ', ' ORDER BY reason) as reasons
FROM wr.claim_adjustments
GROUP BY claim_id, subscription_id;

COMMENT ON VIEW wr.claim_adjustments_total IS 'Total adjustments per claim (all adjustments summed)';

-- =====================================================================
-- 4. CREATE MATERIALIZED VIEW FOR ADJUSTED METRICS
-- =====================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS wr.claim_metrics_adjusted AS
SELECT
  c.subscription_id,
  c.id as claim_id,
  c.claimed_by,
  c.claim_type,
  c.claimed_at,
  a.closer_seller_id,
  a.assisted_seller_id,
  sm.revenue_usd,
  sm.cost_usd,
  sm.margin_amount_usd as original_margin_usd,
  sm.margin_percent as original_margin_percent,
  COALESCE(adj.total_additional_cost_usd, 0) as total_additional_cost_usd,
  adj.adjustment_count,
  adj.last_adjusted_at,
  adj.reasons as adjustment_reasons,
  -- Adjusted calculations
  GREATEST(sm.margin_amount_usd - COALESCE(adj.total_additional_cost_usd, 0), 0) as adjusted_margin_usd,
  CASE
    WHEN sm.revenue_usd > 0
    THEN GREATEST(sm.margin_amount_usd - COALESCE(adj.total_additional_cost_usd, 0), 0) / sm.revenue_usd
    ELSE 0
  END as adjusted_margin_percent
FROM wr.claims c
JOIN wr.attribution a ON a.subscription_id = c.subscription_id
JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
LEFT JOIN wr.claim_adjustments_total adj ON adj.claim_id = c.id;

-- Indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_claim
  ON wr.claim_metrics_adjusted(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_seller
  ON wr.claim_metrics_adjusted(closer_seller_id);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_date
  ON wr.claim_metrics_adjusted(claimed_at);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_sub
  ON wr.claim_metrics_adjusted(subscription_id);

COMMENT ON MATERIALIZED VIEW wr.claim_metrics_adjusted IS 'Pre-computed adjusted metrics per claim with total adjustments applied';

-- =====================================================================
-- 5. CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
-- =====================================================================
CREATE OR REPLACE FUNCTION wr.refresh_claim_metrics_adjusted()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted;
END;
$$;

COMMENT ON FUNCTION wr.refresh_claim_metrics_adjusted IS 'Refresh the adjusted metrics materialized view (use after adjustments)';

-- =====================================================================
-- 6. CREATE TRIGGER TO AUTO-REFRESH ON ADJUSTMENT
-- =====================================================================
-- Note: Materialized views can't have triggers, so we'll call refresh from API
-- But we create a helper function for consistency

CREATE OR REPLACE FUNCTION wr.notify_adjustment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert event for WebSocket notification
  INSERT INTO wr.events (type, subscription_id, actor, payload)
  VALUES (
    'claim.adjusted',
    NEW.subscription_id,
    NEW.adjusted_by,
    jsonb_build_object(
      'claim_id', NEW.claim_id,
      'additional_cost_usd', NEW.additional_cost_usd,
      'reason', NEW.reason
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_claim_adjustment_notification
AFTER INSERT ON wr.claim_adjustments
FOR EACH ROW
EXECUTE FUNCTION wr.notify_adjustment_change();

COMMENT ON FUNCTION wr.notify_adjustment_change IS 'Trigger function to create event when adjustment is added';

-- =====================================================================
-- 7. HELPER FUNCTION: Get adjusted metrics for a claim
-- =====================================================================
CREATE OR REPLACE FUNCTION wr.get_claim_adjusted_metrics(p_claim_id BIGINT)
RETURNS TABLE (
  claim_id BIGINT,
  subscription_id BIGINT,
  original_margin_usd NUMERIC,
  total_additional_cost_usd NUMERIC,
  adjusted_margin_usd NUMERIC,
  adjusted_margin_percent NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cma.claim_id,
    cma.subscription_id,
    cma.original_margin_usd,
    cma.total_additional_cost_usd,
    cma.adjusted_margin_usd,
    cma.adjusted_margin_percent
  FROM wr.claim_metrics_adjusted cma
  WHERE cma.claim_id = p_claim_id;
END;
$$;

COMMENT ON FUNCTION wr.get_claim_adjusted_metrics IS 'Get adjusted metrics for a specific claim';

-- =====================================================================
-- 8. INITIAL REFRESH
-- =====================================================================
-- Refresh the materialized view with existing data
REFRESH MATERIALIZED VIEW wr.claim_metrics_adjusted;

-- =====================================================================
-- VERIFICATION QUERIES (Run these to verify)
-- =====================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'wr' AND table_name = 'claim_adjustments';

-- Check materialized view
-- SELECT * FROM wr.claim_metrics_adjusted LIMIT 5;

-- Test adjustment
-- INSERT INTO wr.claim_adjustments (subscription_id, claim_id, additional_cost_usd, reason, adjusted_by)
-- VALUES (1, 1, 50.00, 'commission', 'admin');

-- REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted;

-- Check adjusted metrics
-- SELECT * FROM wr.claim_metrics_adjusted WHERE claim_id = 1;
