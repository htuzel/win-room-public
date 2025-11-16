-- Win Room v2.0 - Functions
-- IMPORTANT: Review before running!

SET search_path TO wr, public;

-- 5.1) USD/TRY rate function with cache
CREATE OR REPLACE FUNCTION wr_get_usd_try_rate() RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  r NUMERIC;
BEGIN
  -- Try to get from cache first
  SELECT (value->>'rate')::NUMERIC INTO r
  FROM wr.cache_kv
  WHERE key = 'usd_try_rate'
    AND EXTRACT(EPOCH FROM (NOW() - updated_at)) < ttl_seconds
  LIMIT 1;

  IF r IS NOT NULL THEN
    RETURN r;
  END IF;

  -- Cache miss: read from core.custom_settings
  SELECT (value::NUMERIC) INTO r
  FROM custom_settings
  WHERE name = 'dolar'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- Fallback to safe default if not found
  IF r IS NULL THEN
    r := 42;
  END IF;

  -- Update cache
  INSERT INTO wr.cache_kv(key, value, ttl_seconds, updated_at)
  VALUES ('usd_try_rate', jsonb_build_object('rate', r), 86400, NOW())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        updated_at = NOW(),
        ttl_seconds = EXCLUDED.ttl_seconds;

  RETURN r;
END;
$$;

-- Helper function to convert amount to USD
CREATE OR REPLACE FUNCTION wr_convert_to_usd(amount NUMERIC, currency TEXT) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
  rate NUMERIC;
BEGIN
  IF UPPER(currency) = 'USD' THEN
    RETURN amount;
  END IF;

  IF UPPER(currency) IN ('TRY', 'TR') THEN
    rate := wr_get_usd_try_rate();
    RETURN amount / rate;
  END IF;

  -- Unknown currency - return NULL
  RETURN NULL;
END;
$$;

-- Calculate lesson price based on campaign minutes
CREATE OR REPLACE FUNCTION wr_get_lesson_price_usd(campaign_minute INT) RETURNS NUMERIC
LANGUAGE plpgsql AS $$
BEGIN
  CASE campaign_minute
    WHEN 25 THEN RETURN 5;
    WHEN 50 THEN RETURN 10;
    WHEN 20 THEN RETURN 4;
    WHEN 40 THEN RETURN 8;
    ELSE RETURN 5; -- default
  END CASE;
END;
$$;

-- Check if subscription qualifies as jackpot
CREATE OR REPLACE FUNCTION wr_is_jackpot(
  revenue_usd NUMERIC,
  is_free INT,
  payment_channel TEXT,
  status TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  threshold_usd NUMERIC;
BEGIN
  -- Threshold: 30000 TRY converted to USD
  threshold_usd := 30000 / wr_get_usd_try_rate();

  RETURN (
    revenue_usd >= threshold_usd AND
    is_free = 0 AND
    payment_channel != 'Hediye' AND
    status IN ('paid', 'active')
  );
END;
$$;
