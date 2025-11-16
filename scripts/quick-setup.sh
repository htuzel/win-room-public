#!/bin/bash
# Win Room v2.0 - Quick Admin Setup Script
# Creates admin user directly via SQL

set -e

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Win Room v2.0 - Quick Admin Setup             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo ""
  echo "Please set DATABASE_URL environment variable:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:port/db?sslmode=require'"
  echo ""
  echo "Or source your .env file:"
  echo "  export \$(cat .env | grep DATABASE_URL | xargs)"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL found"
echo ""

# Run quick admin creator (prompts for password & Pipedrive ID)
echo "🔐 Creating admin user via scripts/create-admin.ts --quick..."
echo ""
npx tsx scripts/create-admin.ts --quick

echo ""
echo "✅ Admin user created!"
echo ""
echo "🧪 Testing login..."
echo ""

read -p "Email to test [admin@winroom.local]: " EMAIL_INPUT
EMAIL=${EMAIL_INPUT:-admin@winroom.local}
read -sp "Password for $EMAIL: " PASSWORD
echo ""
echo ""

# Test with curl if available
if command -v curl &> /dev/null; then
  echo "Login test (local):"
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq '.' || echo "(Start app first: npm run dev)"
  echo ""
else
  echo "curl not found, skipping API login test."
  echo ""
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the app: npm run dev"
echo "  2. Go to: http://localhost:3000/login"
echo "  3. Login with the credentials you just created"
echo ""
