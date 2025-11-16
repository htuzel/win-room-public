-- Win Room v2.0 - Add Auth Fields to Sellers
-- IMPORTANT: Review before running!

SET search_path TO wr, public;

-- Add password and role fields to sellers table
ALTER TABLE wr.sellers
ADD COLUMN IF NOT EXISTS password_hash TEXT NULL,
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'sales'
  CHECK (role IN ('sales', 'sales_lead', 'admin', 'finance'));

-- Create index on email for faster login lookups
CREATE INDEX IF NOT EXISTS idx_sellers_email ON wr.sellers(email);

-- Example: Update existing sellers with roles
-- UPDATE wr.sellers SET role = 'admin' WHERE seller_id = 'admin';
-- UPDATE wr.sellers SET role = 'sales' WHERE seller_id IN ('merve', 'sait');
