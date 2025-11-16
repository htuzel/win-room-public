-- Win Room v2.0 - Social Reactions & Chat
-- Adds emoji reactions on entities and a lightweight team chat log.

SET search_path TO wr, public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'reaction_target_type'
      AND typnamespace = 'wr'::regnamespace
  ) THEN
    CREATE TYPE wr.reaction_target_type AS ENUM (
      'queue',
      'claim',
      'badge'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS wr.emojis (
  id BIGSERIAL PRIMARY KEY,
  target_type wr.reaction_target_type NOT NULL,
  target_id BIGINT NOT NULL,
  emoji TEXT NOT NULL,
  seller_id TEXT NOT NULL REFERENCES wr.sellers(seller_id) ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (target_type, target_id, emoji, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_emojis_target
  ON wr.emojis(target_type, target_id);

COMMENT ON TABLE wr.emojis IS 'Emoji-style reactions on queue items, claims, or badges';
COMMENT ON COLUMN wr.emojis.target_type IS 'Which entity this reaction belongs to (queue, claim, badge)';
COMMENT ON COLUMN wr.emojis.emoji IS 'The emoji code (🔥, ⚡, 🚀, etc.)';

CREATE TABLE IF NOT EXISTS wr.chats (
  id BIGSERIAL PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES wr.sellers(seller_id) ON UPDATE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_created_at
  ON wr.chats(created_at DESC);

COMMENT ON TABLE wr.chats IS 'Team-wide shoutbox / chat feed (last 50 messages shown in UI)';
