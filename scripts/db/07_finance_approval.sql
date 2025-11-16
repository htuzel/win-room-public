-- Win Room v2.0 - Finance Approval System
-- Finance status tracking for claims
-- IMPORTANT: Review before running!

SET search_path TO wr, public;

-- =====================================================================
-- 1. ADD FINANCE STATUS COLUMNS TO CLAIMS TABLE
-- =====================================================================

-- Add finance_status column (waiting, approved, installment, problem)
ALTER TABLE wr.claims 
ADD COLUMN IF NOT EXISTS finance_status TEXT NOT NULL DEFAULT 'waiting'
CHECK (finance_status IN ('waiting', 'approved', 'installment', 'problem'));

-- Add finance approval tracking columns
ALTER TABLE wr.claims
ADD COLUMN IF NOT EXISTS finance_approved_by TEXT NULL;

ALTER TABLE wr.claims
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ NULL;

ALTER TABLE wr.claims
ADD COLUMN IF NOT EXISTS finance_notes TEXT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_finance_status ON wr.claims(finance_status);
CREATE INDEX IF NOT EXISTS idx_claims_finance_approved_by ON wr.claims(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_claims_finance_approved_at ON wr.claims(finance_approved_at);

-- Comments
COMMENT ON COLUMN wr.claims.finance_status IS 'Finance approval status: waiting (default), approved, installment, problem';
COMMENT ON COLUMN wr.claims.finance_approved_by IS 'seller_id of finance user who approved/changed status';
COMMENT ON COLUMN wr.claims.finance_approved_at IS 'Timestamp when finance status was last updated';
COMMENT ON COLUMN wr.claims.finance_notes IS 'Finance notes/comments about the claim';

-- =====================================================================
-- 2. UPDATE MATERIALIZED VIEW TO INCLUDE FINANCE STATUS
-- =====================================================================

-- Drop and recreate the materialized view with finance columns
DROP MATERIALIZED VIEW IF EXISTS wr.claim_metrics_adjusted;

CREATE MATERIALIZED VIEW wr.claim_metrics_adjusted AS
SELECT
  c.subscription_id,
  c.id as claim_id,
  c.claimed_by,
  c.claim_type,
  c.claimed_at,
  c.finance_status,
  c.finance_approved_by,
  c.finance_approved_at,
  c.finance_notes,
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

-- Recreate indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_claim
  ON wr.claim_metrics_adjusted(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_seller
  ON wr.claim_metrics_adjusted(closer_seller_id);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_date
  ON wr.claim_metrics_adjusted(claimed_at);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_sub
  ON wr.claim_metrics_adjusted(subscription_id);
CREATE INDEX IF NOT EXISTS idx_claim_metrics_adjusted_finance_status
  ON wr.claim_metrics_adjusted(finance_status);

COMMENT ON MATERIALIZED VIEW wr.claim_metrics_adjusted IS 'Pre-computed adjusted metrics per claim with finance status';

-- =====================================================================
-- 3. CREATE TRIGGER FOR FINANCE STATUS CHANGES
-- =====================================================================

CREATE OR REPLACE FUNCTION wr.notify_finance_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert event for WebSocket notification
  INSERT INTO wr.events (type, subscription_id, actor, payload)
  VALUES (
    'finance.status_changed',
    NEW.subscription_id,
    NEW.finance_approved_by,
    jsonb_build_object(
      'claim_id', NEW.id,
      'old_status', OLD.finance_status,
      'new_status', NEW.finance_status,
      'claimed_by', NEW.claimed_by
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_finance_status_notification
AFTER UPDATE OF finance_status ON wr.claims
FOR EACH ROW
WHEN (OLD.finance_status IS DISTINCT FROM NEW.finance_status)
EXECUTE FUNCTION wr.notify_finance_status_change();

COMMENT ON FUNCTION wr.notify_finance_status_change IS 'Trigger function to create event when finance status changes';

-- =====================================================================
-- 4. INITIAL REFRESH
-- =====================================================================
-- Refresh the materialized view with existing data
REFRESH MATERIALIZED VIEW wr.claim_metrics_adjusted;

-- =====================================================================
-- VERIFICATION QUERIES (Run these to verify)
-- =====================================================================

-- Check new columns
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'wr' AND table_name = 'claims'
-- AND column_name LIKE 'finance%';

-- Check materialized view
-- SELECT claim_id, finance_status, finance_approved_by, finance_approved_at
-- FROM wr.claim_metrics_adjusted
-- LIMIT 5;

-- Check finance status distribution
-- SELECT finance_status, COUNT(*) as count
-- FROM wr.claims
-- GROUP BY finance_status;
