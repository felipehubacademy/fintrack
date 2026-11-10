#!/bin/bash

# Script para testar o endpoint check-bills-due-tomorrow via curl
# Simula exatamente o que o GitHub Actions faz

echo "🧪 Testando endpoint: check-bills-due-tomorrow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Carregar variáveis de ambiente (se existir .env)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Variáveis necessárias
APP_URL="${APP_URL:-https://fintrack-web.vercel.app}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "❌ CRON_SECRET não configurado"
  echo "💡 Configure: export CRON_SECRET='seu-secret-aqui'"
  echo "   Ou adicione no arquivo .env: CRON_SECRET=seu-secret-aqui"
  exit 1
fi

echo "📋 Configuração:"
echo "   APP_URL: $APP_URL"
echo "   CRON_SECRET: ${CRON_SECRET:0:10}..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Enviando requisição POST..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Fazer requisição POST
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$APP_URL/api/notifications/check-bills-due-tomorrow" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 30 \
  -v 2>&1)

# Separar código HTTP e corpo da resposta
http_code=$(echo "$response" | grep -oP '\d{3}(?=\s*$)' | tail -1)
body=$(echo "$response" | sed '/^< HTTP/d' | sed '/^< /d' | sed '/^\{/,$!d')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resultado:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Status HTTP: $http_code"
echo ""

if [ -n "$body" ]; then
  echo "📄 Resposta:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Interpretar resultado
if [ "$http_code" = "200" ]; then
  echo "✅ Sucesso! Endpoint funcionando corretamente."
  echo "💡 Verifique os logs no Vercel para ver se processou as contas"
elif [ "$http_code" = "401" ]; then
  echo "❌ Erro de autenticação"
  echo "💡 Verifique se o CRON_SECRET está correto"
  echo "   - GitHub Secrets: https://github.com/felipehubacademy/fintrack/settings/secrets/actions"
  echo "   - Vercel Env Vars: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables"
elif [ "$http_code" = "405" ]; then
  echo "❌ Method Not Allowed"
  echo "💡 O endpoint pode não estar deployado corretamente"
  echo "   Verifique: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/deployments"
elif [ "$http_code" = "404" ]; then
  echo "❌ Endpoint não encontrado"
  echo "💡 O arquivo pode não ter sido deployado"
  echo "   Verifique: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/functions"
elif [ "$http_code" = "500" ]; then
  echo "❌ Erro interno do servidor"
  echo "💡 Verifique os logs no Vercel para mais detalhes"
  echo "   https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/functions"
else
  echo "⚠️ Status HTTP: $http_code"
  echo "💡 Verifique os logs no Vercel para mais detalhes"
fi

echo ""

