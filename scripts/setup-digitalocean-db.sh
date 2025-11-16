#!/bin/bash
# Win Room v2.0 - Digital Ocean Database Schema Setup
# This script sets up the WR schema on Digital Ocean's PostgreSQL

set -e

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Win Room v2.0 - Digital Ocean DB Setup        ║"
echo "║  Setting up WR Schema                          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Read database URL from environment (support DB_URL alias)
DATABASE_URL="${DATABASE_URL:-$DB_URL}"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL (or DB_URL) not set!"
    echo "   Example: export DATABASE_URL='postgresql://user:pass@host:port/db?sslmode=require'"
    exit 1
fi

echo "✅ DATABASE_URL loaded from environment"

echo ""
echo "📦 Step 1/5: Creating WR schema..."
psql "$DATABASE_URL" -f scripts/db/01_create_schema.sql
echo "✅ WR Schema created"
echo ""

echo "📦 Step 2/5: Creating WR tables..."
psql "$DATABASE_URL" -f scripts/db/02_create_tables.sql
echo "✅ WR Tables created"
echo ""

echo "📦 Step 3/5: Creating functions..."
psql "$DATABASE_URL" -f scripts/db/03_create_functions.sql
echo "✅ Functions created"
echo ""

echo "📦 Step 4/5: Adding auth fields to sellers..."
psql "$DATABASE_URL" -f scripts/db/04_add_auth_fields.sql
echo "✅ Auth fields added"
echo ""

if [ -n "$ADMIN_PASSWORD_HASH" ]; then
    echo "📦 Step 5/5: Creating admin user..."

    ADMIN_SELLER_ID="${ADMIN_SELLER_ID:-admin}"
    ADMIN_DISPLAY_NAME="${ADMIN_DISPLAY_NAME:-Admin User}"
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@yourcompany.com}"
    ADMIN_ROLE="${ADMIN_ROLE:-admin}"

    cat > /tmp/create-admin.sql <<EOF
-- Create admin user if not exists (values supplied from environment)
INSERT INTO wr.sellers (
  seller_id,
  display_name,
  email,
  password_hash,
  role,
  is_active,
  created_at
)
VALUES (
  '${ADMIN_SELLER_ID}',
  '${ADMIN_DISPLAY_NAME}',
  '${ADMIN_EMAIL}',
  '${ADMIN_PASSWORD_HASH}',
  '${ADMIN_ROLE}',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;
EOF

    psql "$DATABASE_URL" -f /tmp/create-admin.sql
    rm /tmp/create-admin.sql
    echo "✅ Admin user created"
    echo ""
else
    echo "ℹ️  Step 5/5 skipped: set ADMIN_PASSWORD_HASH to auto-create an admin."
    echo "    Use 'node scripts/hash-password.js YOUR_PASSWORD' to generate a hash."
    echo ""
fi

echo "════════════════════════════════════════════════"
echo "🎉 Digital Ocean Database setup complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Redeploy your app on Digital Ocean"
echo "  2. The app should now work without database errors"
echo ""
