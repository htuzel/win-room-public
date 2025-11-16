-- Win Room v2.0 - Achievement Badges
-- Stores recent gamification events (streaks, jackpots, goal completions, etc.)

SET search_path TO wr, public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'achievement_type'
      AND typnamespace = 'wr'::regnamespace
  ) THEN
    CREATE TYPE wr.achievement_type AS ENUM (
      'streak',
      'jackpot',
      'personal_goal',
      'team_goal',
      'daily_revenue'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS wr.achievements (
  id            BIGSERIAL PRIMARY KEY,
  event_id      BIGINT NULL REFERENCES wr.events(id) ON DELETE SET NULL,
  type          wr.achievement_type NOT NULL,
  seller_id     TEXT NULL REFERENCES wr.sellers(seller_id) ON UPDATE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NULL,
  payload       JSONB NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'wr'
      AND table_name = 'achievements'
      AND column_name = 'dedupe_key'
  ) THEN
    ALTER TABLE wr.achievements
    ADD COLUMN dedupe_key TEXT UNIQUE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_achievements_type_created_at
  ON wr.achievements(type, created_at DESC);

COMMENT ON TABLE wr.achievements IS 'Latest gamification badges shown on dashboard (streaks, jackpots, goals, etc.)';
COMMENT ON COLUMN wr.achievements.event_id IS 'Source wr.events entry (when available)';
COMMENT ON COLUMN wr.achievements.type IS 'Badge category used for UI (streak, jackpot, personal_goal, team_goal, daily_revenue)';
COMMENT ON COLUMN wr.achievements.payload IS 'Optional structured data (counts, revenue, etc.)';
COMMENT ON COLUMN wr.achievements.dedupe_key IS 'Helps prevent duplicate inserts for the same underlying achievement';
