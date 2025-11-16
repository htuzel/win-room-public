#!/bin/bash
# Win Room v2.0 - Test Admin Login Script
#
# Usage:
#   ./scripts/test-admin-login.sh
#   ./scripts/test-admin-login.sh https://your-app.ondigitalocean.app

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URL
APP_URL="${1:-http://localhost:3000}"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  Win Room v2.0 - Admin Login Test             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "App URL: $APP_URL"
echo ""

# Prompt for credentials
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""
echo ""

# Test login
echo "🔐 Testing login..."
echo ""

RESPONSE=$(curl -s -X POST "$APP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Check if response contains success
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Login successful!${NC}"
  echo ""

  # Extract user info
  SELLER_ID=$(echo "$RESPONSE" | grep -o '"seller_id":"[^"]*"' | cut -d'"' -f4)
  USER_EMAIL=$(echo "$RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
  ROLE=$(echo "$RESPONSE" | grep -o '"role":"[^"]*"' | cut -d'"' -f4)

  echo "User Details:"
  echo "─────────────────────────────────────"
  echo "Seller ID: $SELLER_ID"
  echo "Email:     $USER_EMAIL"
  echo "Role:      $ROLE"
  echo "─────────────────────────────────────"
  echo ""

  # Extract token
  TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

  if [ ! -z "$TOKEN" ]; then
    echo "JWT Token (first 50 chars):"
    echo "${TOKEN:0:50}..."
    echo ""

    # Test authenticated endpoint
    echo "🧪 Testing authenticated endpoint..."
    ME_RESPONSE=$(curl -s "$APP_URL/api/auth/me" \
      -H "Authorization: Bearer $TOKEN")

    if echo "$ME_RESPONSE" | grep -q "$SELLER_ID"; then
      echo -e "${GREEN}✅ Token validation successful!${NC}"
    else
      echo -e "${YELLOW}⚠️  Token validation failed${NC}"
    fi
  fi

  echo ""
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo ""

elif echo "$RESPONSE" | grep -q '"error"'; then
  ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  echo -e "${RED}❌ Login failed!${NC}"
  echo ""
  echo "Error: $ERROR_MSG"
  echo ""
  echo "Common issues:"
  echo "  - Email or password incorrect"
  echo "  - User not active"
  echo "  - User doesn't exist"
  echo ""
  exit 1

else
  echo -e "${RED}❌ Unexpected response!${NC}"
  echo ""
  echo "Response:"
  echo "$RESPONSE"
  echo ""
  exit 1
fi
