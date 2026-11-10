#!/bin/bash

# Teste do endpoint de notificações de contas vencendo amanhã
# Uso: ./test-bills-endpoint.sh

# Substitua pelas suas variáveis
APP_URL="${APP_URL:-https://sua-url.vercel.app}"
CRON_SECRET="${CRON_SECRET:-seu-token-aqui}"

echo "🔍 Testando endpoint: $APP_URL/api/notifications/check-bills-due-tomorrow"
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  "$APP_URL/api/notifications/check-bills-due-tomorrow" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Status HTTP: $http_code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Resposta:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$http_code" = "200" ]; then
  echo "✅ Sucesso! Endpoint funcionando."
elif [ "$http_code" = "401" ]; then
  echo "❌ Erro de autenticação. Verifique o CRON_SECRET."
elif [ "$http_code" = "404" ]; then
  echo "❌ Endpoint não encontrado. Verifique a URL."
else
  echo "⚠️ Resposta HTTP: $http_code"
fi



