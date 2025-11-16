-- Win Room v2.0 - Reset Admin Password
-- Usage:
--   node scripts/hash-password.js "YourNewPassword123!"
--   Replace REPLACE_WITH_HASHED_PASSWORD below with the generated hash

SET search_path TO wr, public;

-- Update admin password
UPDATE wr.sellers
SET password_hash = 'REPLACE_WITH_HASHED_PASSWORD'
WHERE seller_id = 'admin';

-- Verify
SELECT
  seller_id,
  email,
  role,
  is_active,
  LEFT(password_hash, 20) as hash_preview
FROM wr.sellers
WHERE seller_id = 'admin';
