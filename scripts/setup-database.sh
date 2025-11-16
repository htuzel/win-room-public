#!/bin/bash
# Win Room v2.0 - Complete Database Setup Script
# This script creates all tables, functions, and the initial admin user

set -e

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Win Room v2.0 - Database Setup                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo ""
  echo "Please set DATABASE_URL environment variable:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:port/db?sslmode=require'"
  echo ""
  echo "Or from .env file:"
  echo "  export \$(cat .env | grep DATABASE_URL | xargs)"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Run migrations in order
echo "📦 Step 1/5: Creating demo core schema (for development)..."
psql "$DATABASE_URL" -f scripts/db/00_create_demo_core.sql
echo "✅ Demo core schema created"
echo ""

echo "📦 Step 2/5: Creating WR schema..."
psql "$DATABASE_URL" -f scripts/db/01_create_schema.sql
echo "✅ WR Schema created"
echo ""

echo "📦 Step 3/5: Creating WR tables..."
psql "$DATABASE_URL" -f scripts/db/02_create_tables.sql
echo "✅ WR Tables created"
echo ""

echo "📦 Step 4/5: Creating functions..."
psql "$DATABASE_URL" -f scripts/db/03_create_functions.sql
echo "✅ Functions created"
echo ""

echo "📦 Step 5/5: Adding auth fields..."
psql "$DATABASE_URL" -f scripts/db/04_add_auth_fields.sql
echo "✅ Auth fields added"
echo ""

echo "════════════════════════════════════════════════"
echo "🎉 Database setup complete!"
echo "════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Create an admin user with your own credentials:"
echo "     npx tsx scripts/create-admin.ts"
echo "     # veya hızlı mod: npx tsx scripts/create-admin.ts --quick"
echo "  2. Start the app:"
echo "     Terminal 1: npm run dev"
echo "     Terminal 2: npm run dev:socket"
echo "     Terminal 3: npm run dev:worker"
echo ""
echo "  3. Login at: http://localhost:3000/login"
echo ""
