-- Win Room v2.0 - Installment Management Schema
-- Creates installment plan tables + helper columns

SET search_path TO wr, public;

-- ================================================================
-- 1) wr.installments - Plan metadata
-- ================================================================

CREATE TABLE IF NOT EXISTS wr.installments (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  claim_id BIGINT NULL REFERENCES wr.claims(id) ON DELETE SET NULL,
  customer_name TEXT NULL,
  customer_email TEXT NULL,
  total_amount NUMERIC(12,2) NULL,
  currency TEXT DEFAULT 'USD',
  total_installments INT NOT NULL CHECK (total_installments BETWEEN 2 AND 36),
  default_interval_days INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','frozen','cancelled')),
  next_due_payment_id BIGINT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frozen_at TIMESTAMPTZ NULL,
  frozen_by TEXT NULL,
  frozen_reason TEXT NULL,
  notes TEXT NULL
);

-- Unique constraint to prevent duplicate plans per subscription
-- This prevents race conditions when creating installment plans
ALTER TABLE wr.installments
  ADD CONSTRAINT uq_installments_subscription_id UNIQUE (subscription_id);

-- Foreign key to prevent orphaned installment plans
ALTER TABLE wr.installments
  ADD CONSTRAINT fk_installments_subscription_id
  FOREIGN KEY (subscription_id) REFERENCES wr.subscriptions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_installments_status
  ON wr.installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_next_due
  ON wr.installments(next_due_payment_id);

COMMENT ON TABLE wr.installments IS 'Installment plan header per subscription (one active per subscription)';
COMMENT ON COLUMN wr.installments.total_installments IS 'Number of scheduled payments for the plan';
COMMENT ON COLUMN wr.installments.default_interval_days IS 'Default interval (days) used when auto-creating schedule';

-- ================================================================
-- 2) wr.installment_payments - Individual dues
-- ================================================================

CREATE TABLE IF NOT EXISTS wr.installment_payments (
  id BIGSERIAL PRIMARY KEY,
  installment_id BIGINT NOT NULL REFERENCES wr.installments(id) ON DELETE CASCADE,
  payment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','confirmed','overdue','waived','rejected')),
  paid_at TIMESTAMPTZ NULL,
  paid_amount NUMERIC(12,2) NULL,
  payment_channel TEXT NULL,
  submitted_by TEXT NULL,
  submitted_at TIMESTAMPTZ NULL,
  confirmed_by TEXT NULL,
  confirmed_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  notes TEXT NULL,
  tolerance_until DATE NULL,
  tolerance_reason TEXT NULL,
  tolerance_given_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (installment_id, payment_number)
);

CREATE INDEX IF NOT EXISTS idx_installment_payments_installment
  ON wr.installment_payments(installment_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date
  ON wr.installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status
  ON wr.installment_payments(status);
-- Composite index for overdue queries (commonly filtered together)
CREATE INDEX IF NOT EXISTS idx_installment_payments_status_due_date
  ON wr.installment_payments(status, due_date);

COMMENT ON TABLE wr.installment_payments IS 'Detailed payment schedule for each installment plan';
COMMENT ON COLUMN wr.installment_payments.status IS 'pending (waiting), submitted (sales marked paid), confirmed (finance approved), overdue, waived, rejected';

-- ================================================================
-- 3) wr.installment_actions - Audit log
-- ================================================================

CREATE TABLE IF NOT EXISTS wr.installment_actions (
  id BIGSERIAL PRIMARY KEY,
  installment_id BIGINT NOT NULL REFERENCES wr.installments(id) ON DELETE CASCADE,
  payment_id BIGINT NULL REFERENCES wr.installment_payments(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'created','freeze','unfreeze','cancel',
      'mark_paid','mark_overdue','add_tolerance','update_note',
      'submit_payment','confirm_payment','reject_payment'
    )),
  actor TEXT NOT NULL,
  notes TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installment_actions_installment
  ON wr.installment_actions(installment_id);
CREATE INDEX IF NOT EXISTS idx_installment_actions_payment
  ON wr.installment_actions(payment_id);

COMMENT ON TABLE wr.installment_actions IS 'Audit log for every significant installment operation';

-- ================================================================
-- 4) Helper columns on queue + claims
-- ================================================================

ALTER TABLE wr.queue
ADD COLUMN IF NOT EXISTS installment_count INT NULL,
ADD COLUMN IF NOT EXISTS installment_plan_id BIGINT NULL REFERENCES wr.installments(id) ON DELETE SET NULL;

ALTER TABLE wr.claims
ADD COLUMN IF NOT EXISTS installment_count INT NULL,
ADD COLUMN IF NOT EXISTS installment_plan_id BIGINT NULL REFERENCES wr.installments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_queue_installment_plan ON wr.queue(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_claims_installment_plan ON wr.claims(installment_plan_id);

COMMENT ON COLUMN wr.queue.installment_plan_id IS 'Optional pointer to current installment plan for this queue row';
COMMENT ON COLUMN wr.claims.installment_plan_id IS 'Optional pointer to current installment plan for this claim';

-- ================================================================
-- 5) Helper views
-- ================================================================

CREATE OR REPLACE VIEW wr.v_installment_payment_status AS
SELECT
  ip.id AS payment_id,
  ip.installment_id,
  i.subscription_id,
  i.status AS plan_status,
  ip.payment_number,
  ip.due_date,
  ip.amount,
  ip.status,
  ip.tolerance_until,
  GREATEST(0, (CURRENT_DATE - ip.due_date)) AS overdue_days,
  CASE
    WHEN ip.tolerance_until IS NOT NULL AND ip.tolerance_until >= CURRENT_DATE THEN TRUE
    ELSE FALSE
  END AS tolerance_active
FROM wr.installment_payments ip
JOIN wr.installments i ON i.id = ip.installment_id;

COMMENT ON VIEW wr.v_installment_payment_status IS 'Precomputed helper for UI to quickly determine overdue/tolerance state';
