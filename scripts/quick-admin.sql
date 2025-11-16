-- Win Room v2.0 - Quick Admin Creation (SQL)
-- This template upserts an admin user with your own hashed password
--
-- Usage:
-- 1. Generate a bcrypt hash (min 8 char password):
--      node scripts/hash-password.js "YourStrongPassword123!"
-- 2. Replace the placeholder values below with your target data
-- 3. Run: psql $DATABASE_URL -f scripts/quick-admin.sql

SET search_path TO wr, public;

INSERT INTO wr.sellers (
  seller_id,
  display_name,
  email,
  password_hash,
  role,
  is_active
) VALUES (
  'admin',                       -- replace with your seller_id if needed
  'Admin',                       -- display name
  'admin@winroom.local',         -- email (lowercase)
  'REPLACE_WITH_HASHED_PASSWORD',-- bcrypt hash from step 1
  'admin',                       -- role
  true
)
ON CONFLICT (seller_id) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Verify
SELECT
  seller_id,
  display_name,
  email,
  role,
  is_active,
  password_hash IS NOT NULL as has_password
FROM wr.sellers
WHERE seller_id = 'admin';
