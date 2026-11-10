#!/bin/bash

# Script para testar o workflow Daily Notifications
# Simula exatamente o que o GitHub Actions faz

echo "🧪 Testando Workflow Daily Notifications"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Carregar variáveis de ambiente (se existir .env)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Variáveis necessárias (substituir pelos valores reais)
APP_URL="${APP_URL:-https://fintrack-web.vercel.app}"
CRON_SECRET="${CRON_SECRET:-test-secret}"

echo "📋 Configuração:"
echo "   APP_URL: $APP_URL"
echo "   CRON_SECRET: ${CRON_SECRET:0:10}..."
echo ""

# Teste 1: Check Bills Due Tomorrow
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣ Testando: Check Bills Due Tomorrow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$APP_URL/api/notifications/check-bills-due-tomorrow" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 30)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "Status: $http_code"
if [ -n "$body" ]; then
  echo "Response: $body"
fi

if [ "$http_code" = "200" ]; then
  echo "✅ Sucesso!"
elif [ "$http_code" = "401" ]; then
  echo "❌ Erro de autenticação - CRON_SECRET incorreto"
elif [ "$http_code" = "404" ] || [ "$http_code" = "405" ]; then
  echo "❌ Endpoint não encontrado"
else
  echo "⚠️ Status: $http_code"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣ Testando: Check Bills Due Today"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$APP_URL/api/notifications/check-bills" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 30)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "Status: $http_code"
if [ -n "$body" ]; then
  echo "Response: $body"
fi

if [ "$http_code" = "200" ]; then
  echo "✅ Sucesso!"
elif [ "$http_code" = "401" ]; then
  echo "❌ Erro de autenticação - CRON_SECRET incorreto"
elif [ "$http_code" = "404" ] || [ "$http_code" = "405" ]; then
  echo "❌ Endpoint não encontrado"
else
  echo "⚠️ Status: $http_code"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Teste concluído!"
echo ""
echo "💡 Para usar com suas variáveis:"
echo "   APP_URL='sua-url' CRON_SECRET='seu-token' ./test-workflow.sh"

