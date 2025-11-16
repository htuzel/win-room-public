-- Win Room v2.0 - Attribution Share Support
-- Adds share percentages to wr.attribution so revenue/wins can be split between closer and assisted sellers.

SET search_path TO wr, public;

-- 1) Add share columns with safe defaults
ALTER TABLE wr.attribution
  ADD COLUMN IF NOT EXISTS closer_share_percent NUMERIC(5,4) NOT NULL DEFAULT 1.0;

ALTER TABLE wr.attribution
  ADD COLUMN IF NOT EXISTS assisted_share_percent NUMERIC(5,4) NOT NULL DEFAULT 0.0;

-- Normalise historical rows (assume 100% credit to closer)
UPDATE wr.attribution
SET closer_share_percent = 1.0
WHERE closer_share_percent IS NULL;

UPDATE wr.attribution
SET assisted_share_percent = 0.0
WHERE assisted_share_percent IS NULL;

-- 2) Constraints to keep values in range and ensure totals make sense
ALTER TABLE wr.attribution
  ADD CONSTRAINT attribution_closer_share_range
    CHECK (closer_share_percent >= 0 AND closer_share_percent <= 1);

ALTER TABLE wr.attribution
  ADD CONSTRAINT attribution_assisted_share_range
    CHECK (assisted_share_percent >= 0 AND assisted_share_percent <= 1);

ALTER TABLE wr.attribution
  ADD CONSTRAINT attribution_share_sum
    CHECK (
      (assisted_seller_id IS NULL AND closer_share_percent = 1 AND assisted_share_percent = 0)
      OR (assisted_seller_id IS NOT NULL AND ABS((closer_share_percent + assisted_share_percent) - 1) <= 0.0001)
    );

-- 3) Helper view to work with flattened shares
DROP VIEW IF EXISTS wr.attribution_share_entries;

CREATE VIEW wr.attribution_share_entries AS
SELECT
  subscription_id,
  closer_seller_id AS seller_id,
  'closer'::text AS role,
  closer_share_percent AS share_percent
FROM wr.attribution
UNION ALL
SELECT
  subscription_id,
  assisted_seller_id AS seller_id,
  'assisted'::text AS role,
  assisted_share_percent AS share_percent
FROM wr.attribution
WHERE assisted_seller_id IS NOT NULL;

COMMENT ON VIEW wr.attribution_share_entries IS 'Flattened seller share entries (closer + assisted) for each subscription.';
