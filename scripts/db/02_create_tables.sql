-- Win Room v2.0 - Table Definitions
-- IMPORTANT: Review before running! This creates all wr schema tables.

SET search_path TO wr, public;

-- 4.1) wr.queue - Live queue
CREATE TABLE IF NOT EXISTS wr.queue (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  source_created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','claimed','excluded','expired','refunded')),
  fingerprint TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  excluded_by TEXT NULL,
  excluded_at TIMESTAMPTZ NULL,
  exclude_reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON wr.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_created_at ON wr.queue(created_at);

-- 4.2) wr.claims - Claim records
CREATE TABLE IF NOT EXISTS wr.claims (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL UNIQUE,
  claimed_by TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('first_sales','remarketing','upgrade','installment')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attribution_source TEXT NOT NULL DEFAULT 'claim'
);

CREATE INDEX IF NOT EXISTS idx_claims_claimed_by ON wr.claims(claimed_by);
CREATE INDEX IF NOT EXISTS idx_claims_claimed_at ON wr.claims(claimed_at);

-- 4.3) wr.attribution - Who gets credit
CREATE TABLE IF NOT EXISTS wr.attribution (
  subscription_id BIGINT PRIMARY KEY,
  closer_seller_id TEXT NOT NULL,
  resolved_from TEXT NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assisted_seller_id TEXT NULL
);

-- 4.4) wr.sellers - Identity mapping
CREATE TABLE IF NOT EXISTS wr.sellers (
  seller_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  pipedrive_owner_id BIGINT NULL,
  core_sales_person TEXT NULL,
  email TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS wr_sellers_owner_uidx ON wr.sellers(pipedrive_owner_id) WHERE pipedrive_owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wr_sellers_core_idx ON wr.sellers(core_sales_person);

-- 4.5) wr.events - Events to publish
CREATE TABLE IF NOT EXISTS wr.events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  subscription_id BIGINT NULL,
  actor TEXT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_at ON wr.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON wr.events(type);

-- 4.6) wr.sales_goals - Global goals (day, 15d, month)
CREATE TABLE IF NOT EXISTS wr.sales_goals (
  id BIGSERIAL PRIMARY KEY,
  period_type TEXT CHECK (period_type IN ('day','15d','month')) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_type TEXT CHECK (target_type IN ('count','revenue','margin_amount')) NOT NULL,
  target_value NUMERIC NOT NULL,
  visibility_scope TEXT CHECK (visibility_scope IN ('admin_only','sales_percent_only')) DEFAULT 'sales_percent_only',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_goals_period ON wr.sales_goals(period_start, period_end);

-- 4.7) wr.personal_goals - Personal goals
CREATE TABLE IF NOT EXISTS wr.personal_goals (
  id BIGSERIAL PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES wr.sellers(seller_id) ON UPDATE CASCADE,
  period_type TEXT CHECK (period_type IN ('day','15d','month')) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_type TEXT CHECK (target_type IN ('count','revenue','margin_amount')) NOT NULL,
  target_value NUMERIC NOT NULL,
  visibility_scope TEXT CHECK (visibility_scope IN ('owner_only','admin_only')) DEFAULT 'owner_only',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_goals_seller ON wr.personal_goals(seller_id, period_start, period_end);

-- 4.8) wr.progress_cache - Progress percentage cache
CREATE TABLE IF NOT EXISTS wr.progress_cache (
  goal_scope TEXT NOT NULL,
  goal_id BIGINT NOT NULL,
  as_of_date DATE NOT NULL,
  percent NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (goal_scope, goal_id, as_of_date)
);

-- 4.9) wr.objections - Objection workflow
CREATE TABLE IF NOT EXISTS wr.objections (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  raised_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  admin_note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_objections_subscription ON wr.objections(subscription_id);
CREATE INDEX IF NOT EXISTS idx_objections_status ON wr.objections(status);

-- 4.10) wr.exclusions - Excluded sales
CREATE TABLE IF NOT EXISTS wr.exclusions (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  excluded_by TEXT NOT NULL,
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_exclusions_subscription ON wr.exclusions(subscription_id);

-- 4.11) wr.refunds - Refund tracking
CREATE TABLE IF NOT EXISTS wr.refunds (
  id BIGSERIAL PRIMARY KEY,
  subscription_id BIGINT NOT NULL UNIQUE,
  refunded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NULL,
  amount_usd NUMERIC NULL
);

CREATE INDEX IF NOT EXISTS idx_refunds_subscription ON wr.refunds(subscription_id);

-- 4.12) wr.streak_state - Global streak tracking
CREATE TABLE IF NOT EXISTS wr.streak_state (
  id SERIAL PRIMARY KEY,
  current_claimer TEXT NULL,
  current_count INT NOT NULL DEFAULT 0,
  last_claim_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial row if not exists
INSERT INTO wr.streak_state (current_count)
VALUES (0)
ON CONFLICT DO NOTHING;

-- 4.13) wr.cache_kv - General purpose cache
CREATE TABLE IF NOT EXISTS wr.cache_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds INT NOT NULL DEFAULT 86400
);

-- 4.14) wr.subscription_metrics - Computed metrics
CREATE TABLE IF NOT EXISTS wr.subscription_metrics (
  subscription_id BIGINT PRIMARY KEY,
  revenue_usd NUMERIC NULL,
  cost_usd NUMERIC NULL,
  margin_amount_usd NUMERIC NULL,
  margin_percent NUMERIC NULL,
  is_jackpot BOOLEAN NOT NULL DEFAULT FALSE,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  currency_source TEXT NOT NULL,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_metrics_computed ON wr.subscription_metrics(computed_at);
