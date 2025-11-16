#!/bin/bash
# Win Room v2.0 - WR Schema Setup (Production Database)
# This script sets up ONLY the WR schema without touching core tables

set -e

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Win Room v2.0 - WR Schema Setup               ║"
echo "║  Database: flalingo_new                        ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Connection string (prefer DB_URL, fallback to DATABASE_URL)
DB_URL="${DB_URL:-$DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "❌ DB_URL or DATABASE_URL environment variable is required!"
  echo "   Example: export DB_URL='postgresql://user:pass@host:port/db?sslmode=require'"
  exit 1
fi

echo "✅ Database URL loaded from environment"
echo ""

echo "📦 Step 1/4: Creating WR schema..."
psql "$DB_URL" -f scripts/db/01_create_schema.sql
echo "✅ WR Schema created"
echo ""

echo "📦 Step 2/4: Creating WR tables..."
psql "$DB_URL" -f scripts/db/02_create_tables.sql
echo "✅ WR Tables created"
echo ""

echo "📦 Step 3/4: Creating functions..."
psql "$DB_URL" -f scripts/db/03_create_functions.sql
echo "✅ Functions created"
echo ""

echo "📦 Step 4/4: Adding auth fields to sellers..."
psql "$DB_URL" -f scripts/db/04_add_auth_fields.sql
echo "✅ Auth fields added"
echo ""

echo "════════════════════════════════════════════════"
echo "🎉 WR Schema setup complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Create an admin user with your own credentials:"
echo "     npx tsx scripts/create-admin.ts"
echo "     # or to use quick mode: npx tsx scripts/create-admin.ts --quick"
echo "  2. Update your .env with the production database connection"
echo "  3. Start services:"
echo "     Terminal 1: npm run dev"
echo "     Terminal 2: npm run dev:socket"
echo "     Terminal 3: npm run dev:worker"
echo "  4. Login at: http://localhost:3000/login"
echo ""
