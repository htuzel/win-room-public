-- Win Room v2.0 - Create Admin User (SQL Method)
-- IMPORTANT: This is a template. You need to generate the password hash first!
--
-- How to use:
-- 1. Generate password hash using Node.js:
--    node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD', 10).then(console.log);"
--
-- 2. Replace 'YOUR_HASHED_PASSWORD_HERE' below with the generated hash
--
-- 3. Run this SQL file:
--    psql $DATABASE_URL -f scripts/create-admin.sql
--
-- OR manually insert in psql console

SET search_path TO wr, public;

-- Example: Create admin user
-- REPLACE the values below with your actual values!

INSERT INTO wr.sellers (
  seller_id,
  display_name,
  email,
  password_hash,
  role,
  is_active
) VALUES (
  'admin',                                    -- Seller ID (unique)
  'Admin User',                               -- Display name
  'admin@winroom.local',                      -- Email (unique, lowercase)
  'YOUR_HASHED_PASSWORD_HERE',                -- Password hash (generate first!)
  'admin',                                    -- Role: 'admin', 'finance', 'sales_lead', 'sales'
  true                                        -- Is active
)
ON CONFLICT (seller_id) DO NOTHING;

-- Optional: Add Pipedrive integration
-- UPDATE wr.sellers SET pipedrive_owner_id = 12345 WHERE seller_id = 'admin';

-- Verify the user was created
SELECT
  seller_id,
  display_name,
  email,
  role,
  is_active,
  password_hash IS NOT NULL as has_password,
  created_at
FROM wr.sellers
WHERE seller_id = 'admin';

-- Example output:
-- seller_id | display_name |        email         | role  | is_active | has_password |         created_at
-- -----------+--------------+----------------------+-------+-----------+--------------+----------------------------
-- admin     | Admin User   | admin@winroom.local  | admin | t         | t            | 2025-10-24 10:30:00+00
