-- Win Room v2.0 - Demo Core Schema
-- ⚠️ FOR DEVELOPMENT/TESTING ONLY!
-- This creates minimal core tables for testing Win Room without a real production database

-- Note: In production, these tables already exist from your main application

-- Create users table (simplified)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaigns table (simplified)
CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_minute INTEGER DEFAULT 25,  -- 25 or 50 minute lessons
  campaign_lenght INTEGER DEFAULT 12,  -- weeks
  per_week INTEGER DEFAULT 2,          -- lessons per week
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table (core table for Win Room)
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id),
  subs_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active',
  is_free INTEGER DEFAULT 0,
  payment_channel TEXT,
  stripe_sub_id TEXT,
  paypal_sub_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_campaign ON subscriptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_updated ON subscriptions(updated_at);

-- Create pipedrive_users table (for owner mapping)
CREATE TABLE IF NOT EXISTS pipedrive_users (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom_settings table (for USD/TRY rate)
CREATE TABLE IF NOT EXISTS custom_settings (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo data

-- Demo campaigns
INSERT INTO campaigns (id, name, campaign_minute, campaign_lenght, per_week)
VALUES
  (1, 'Standard English Course', 25, 12, 2),
  (2, 'Intensive English Course', 50, 12, 3),
  (3, 'Business English', 25, 8, 2)
ON CONFLICT (id) DO NOTHING;

-- Demo users
INSERT INTO users (id, email)
VALUES
  (1, 'customer1@example.com'),
  (2, 'customer2@example.com'),
  (3, 'customer3@example.com')
ON CONFLICT (id) DO NOTHING;

-- Demo subscriptions
INSERT INTO subscriptions (id, user_id, campaign_id, subs_amount, currency, status, created_at)
VALUES
  (1, 1, 1, 500.00, 'USD', 'active', NOW() - INTERVAL '1 day'),
  (2, 2, 2, 1200.00, 'USD', 'active', NOW() - INTERVAL '2 hours'),
  (3, 3, 1, 21000.00, 'TRY', 'active', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Demo Pipedrive users
INSERT INTO pipedrive_users (owner_id, name, email)
VALUES
  (12345, 'Merve Sales', 'merve@example.com'),
  (12346, 'Sait Sales', 'sait@example.com')
ON CONFLICT (owner_id) DO NOTHING;

-- USD/TRY rate (custom_settings)
INSERT INTO custom_settings (name, value)
VALUES
  ('dolar', '42.00')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Success message
SELECT
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM campaigns) as campaigns_count,
  (SELECT COUNT(*) FROM subscriptions) as subscriptions_count,
  (SELECT COUNT(*) FROM pipedrive_users) as pipedrive_users_count,
  (SELECT value FROM custom_settings WHERE name = 'dolar') as usd_try_rate;
