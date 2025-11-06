#!/bin/bash

# Script to test Google Drive OAuth token refresh functionality
# Usage: ./scripts/test-token-refresh.sh [base_url]

BASE_URL="${1:-http://localhost:3000}"
TEST_ENDPOINT="${BASE_URL}/api/google/oauth/test-tokens"

echo "🧪 Testing Google Drive OAuth Token Refresh"
echo "============================================"
echo ""
echo "📍 Testing endpoint: ${TEST_ENDPOINT}"
echo ""

# Make the request
echo "📡 Sending GET request..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "${TEST_ENDPOINT}" \
  -H "Cookie: $(cat .cookies 2>/dev/null || echo '')" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 HTTP Status Code: ${HTTP_CODE}"
echo ""
echo "📋 Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Parse response
if echo "$BODY" | grep -q '"success":true'; then
  if echo "$BODY" | grep -q '"refreshTest".*"success":true'; then
    echo "✅ Token refresh test PASSED!"
    exit 0
  elif echo "$BODY" | grep -q '"refreshTest".*"attempted":false'; then
    echo "ℹ️  Token is valid, no refresh needed"
    echo "💡 To test refresh, wait for token to expire or manually expire it"
    exit 0
  else
    echo "❌ Token refresh test FAILED"
    echo "$BODY" | jq -r '.refreshTest.error // .error // "Unknown error"' 2>/dev/null || echo "Check response above"
    exit 1
  fi
else
  echo "❌ Test failed - no tokens found or error occurred"
  echo "$BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Check response above"
  exit 1
fi
