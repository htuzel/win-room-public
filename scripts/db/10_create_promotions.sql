-- Win Room v2.0 - Fix Promotions Table
-- Run this to check and fix the promotions table schema

-- Step 1: Check current schema (run this first to see what exists)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'promotions'
-- ORDER BY ordinal_position;

-- Step 2a: If table exists with wrong schema, drop and recreate
DROP TABLE IF EXISTS wr.promotions CASCADE;

CREATE TABLE wr.promotions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  variant VARCHAR(20) NOT NULL CHECK (variant IN ('promo', 'info', 'success', 'warning')),
  icon VARCHAR(10) NOT NULL DEFAULT '🎯',
  visible BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for quick lookup of active promotion
CREATE INDEX idx_promotions_visible ON wr.promotions (visible) WHERE visible = true;

-- Insert default promotion
INSERT INTO wr.promotions (title, message, variant, icon, visible, created_by)
VALUES (
  'Black Friday Başladı! 🔥',
  'Şov zamanı! Bugün özel indirimler var, hızlı karar alıp müşterilerinizi kazanın. En çok satan kazanır!',
  'promo',
  '🎯',
  true,
  'system'
);

-- Function to ensure only one visible promotion at a time
CREATE OR REPLACE FUNCTION wr.ensure_single_visible_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visible = true THEN
    UPDATE wr.promotions SET visible = false WHERE id != NEW.id AND visible = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single visible promotion
DROP TRIGGER IF EXISTS trigger_single_visible_promotion ON wr.promotions;
CREATE TRIGGER trigger_single_visible_promotion
  BEFORE INSERT OR UPDATE ON wr.promotions
  FOR EACH ROW
  WHEN (NEW.visible = true)
  EXECUTE FUNCTION wr.ensure_single_visible_promotion();

-- Verify the table was created correctly
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'wr' AND table_name = 'promotions'
ORDER BY ordinal_position;
