#!/bin/bash

# Teste simples do endpoint via curl
# Uso: ./test-curl-simple.sh SEU_CRON_SECRET

CRON_SECRET="${1:-${CRON_SECRET}}"
APP_URL="https://fintrack-web.vercel.app"

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET não fornecido"
  echo "Uso: ./test-curl-simple.sh SEU_CRON_SECRET"
  echo "Ou: export CRON_SECRET='seu-secret' && ./test-curl-simple.sh"
  exit 1
fi

echo "🧪 Testando: $APP_URL/api/notifications/check-bills-due-tomorrow"
echo ""

curl -X POST "$APP_URL/api/notifications/check-bills-due-tomorrow" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""

