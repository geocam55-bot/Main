#!/bin/bash

echo "=================================================="
echo "  OAuth Endpoints Test Script"
echo "=================================================="
echo ""

# Get Supabase project ID
read -p "Enter your Supabase Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
  echo "❌ Error: Project ID is required"
  exit 1
fi

BASE_URL="https://${PROJECT_ID}.supabase.co/functions/v1/make-server-8405be07"

echo ""
echo "Testing endpoints at: $BASE_URL"
echo ""

# Test main health endpoint
echo "1️⃣  Testing main health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health endpoint OK"
  echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE"
else
  echo "❌ Health endpoint failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test Google OAuth health
echo "2️⃣  Testing Google OAuth health..."
GOOGLE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/google-health")
HTTP_CODE=$(echo "$GOOGLE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Google OAuth endpoint OK"
  echo "$GOOGLE_RESPONSE" | grep -v "HTTP_CODE"
else
  echo "❌ Google OAuth endpoint failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test Microsoft OAuth health
echo "3️⃣  Testing Microsoft OAuth health..."
MS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${BASE_URL}/microsoft-health")
HTTP_CODE=$(echo "$MS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Microsoft OAuth endpoint OK"
  echo "$MS_RESPONSE" | grep -v "HTTP_CODE"
else
  echo "❌ Microsoft OAuth endpoint failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "=================================================="
echo "  Test Complete"
echo "=================================================="
echo ""
echo "📚 Next steps:"
echo "1. If any endpoints failed, check deployment: npx supabase functions deploy make-server --no-verify-jwt"
echo "2. If credentials show 'missing', set secrets: npx supabase secrets set GOOGLE_CLIENT_ID=..."
echo "3. See DIRECT_OAUTH_SETUP.md for full setup instructions"
echo ""
