#!/bin/bash

# Script para testar todos os endpoints da API

echo "🧪 Testando todos os endpoints da API do web"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BASE_URL="https://fintrack-web.vercel.app"
CRON_SECRET="b80c03bc2196b3a78a386063a20ee36b563a05406414a8016fb361b3aa11dadc"

test_endpoint() {
  local method=$1
  local endpoint=$2
  local headers=$3
  local data=$4
  
  echo "Testing: $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" $headers)
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" $headers -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "  ✅ HTTP $http_code"
  elif [ "$http_code" = "400" ] || [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
    echo "  ⚠️  HTTP $http_code (esperado - precisa autenticação/dados)"
  elif [ "$http_code" = "405" ]; then
    echo "  ❌ HTTP $http_code (Method Not Allowed)"
  elif [ "$http_code" = "404" ]; then
    echo "  ❌ HTTP $http_code (Not Found)"
  else
    echo "  ⚠️  HTTP $http_code"
  fi
  
  echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Endpoints de Notificações"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "GET" "/api/notifications/list" "" ""
test_endpoint "POST" "/api/notifications/check-bills" "-H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'" "{}"
test_endpoint "POST" "/api/notifications/check-bills-due-tomorrow" "-H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'" "{}"
test_endpoint "POST" "/api/notifications/check-investments" "-H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'" "{}"
test_endpoint "POST" "/api/notifications/check-budget-alerts" "-H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'" "{}"
test_endpoint "POST" "/api/notifications/check-daily-engagement" "-H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'" "{}"
test_endpoint "POST" "/api/notifications/send-weekly-report" "-H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json'" "{}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Endpoints que sabemos que funcionam"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "POST" "/api/send-verification-code" "-H 'Content-Type: application/json'" '{"userId":"test","userPhone":"test"}'
test_endpoint "POST" "/api/verify-code" "-H 'Content-Type: application/json'" '{"phone":"test","code":"test"}'
test_endpoint "POST" "/api/zul-chat" "-H 'Content-Type: application/json'" '{"message":"test"}'
test_endpoint "POST" "/api/send-invite" "-H 'Content-Type: application/json'" '{"email":"test@test.com"}'
test_endpoint "POST" "/api/support/send" "-H 'Content-Type: application/json'" '{"name":"test","email":"test@test.com","subject":"test","message":"test"}'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Endpoints de Expenses"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "GET" "/api/expenses/general" "" ""
test_endpoint "GET" "/api/expenses/summary" "" ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Teste concluído!"
echo ""

