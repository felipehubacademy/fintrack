#!/bin/bash

# Test script for backend API endpoints

BACKEND_URL=${1:-http://localhost:3000}

echo "🧪 Testing FinTrack Backend"
echo "=========================="
echo "Backend URL: $BACKEND_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "---------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Health check passed"
    echo "Response: $BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Pluggy Auth
echo "Test 2: Pluggy Authentication"
echo "------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BACKEND_URL/auth)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Pluggy auth passed"
    echo "Response: $BODY"
else
    echo "❌ Pluggy auth failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    echo "⚠️  Check your PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET"
fi
echo ""

# Test 3: Check transactions
echo "Test 3: Check Transactions"
echo "--------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/check)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Transaction check passed"
    echo "Response: $BODY"
else
    echo "❌ Transaction check failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    echo "⚠️  Check your Pluggy and Supabase credentials"
fi
echo ""

echo "🎉 Testing complete!"
echo ""
echo "If any tests failed, check:"
echo "1. Backend is running (npm start in backend/)"
echo "2. Environment variables are set correctly"
echo "3. Supabase database table exists"
echo "4. Pluggy connection is active"

