-- Win Room v2.0 - Lead Assignment Tracking
-- Creates daily aggregation table for Pipedrive owner lead counts

SET search_path TO wr, public;

CREATE TABLE IF NOT EXISTS wr.lead_assignments_daily (
  assignment_date DATE NOT NULL,
  pipedrive_owner_id BIGINT NOT NULL,
  seller_id TEXT NULL REFERENCES wr.sellers(seller_id) ON UPDATE CASCADE,
  lead_count INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assignment_date, pipedrive_owner_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_seller
  ON wr.lead_assignments_daily(seller_id);

COMMENT ON TABLE wr.lead_assignments_daily IS 'Daily count of leads assigned per Pipedrive owner (joined to sellers when available)';
COMMENT ON COLUMN wr.lead_assignments_daily.assignment_date IS 'UTC date bucket (midnight) of the lead assignment';
COMMENT ON COLUMN wr.lead_assignments_daily.lead_count IS 'Number of leads created/assigned on that date';
