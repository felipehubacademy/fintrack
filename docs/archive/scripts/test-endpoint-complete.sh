#!/bin/bash

# Script completo para testar o endpoint
# Uso: ./test-endpoint-complete.sh

echo "🧪 Teste Completo do Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se o servidor está rodando
echo "1️⃣ Verificando se o servidor Next.js está rodando..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Servidor rodando em http://localhost:3000"
    SERVER_RUNNING=true
else
    echo "   ⚠️  Servidor não está rodando"
    echo "   💡 Para iniciar: cd web && npm run dev"
    SERVER_RUNNING=false
fi

echo ""
echo "2️⃣ Testando endpoint no Vercel..."
echo ""

# URL do Vercel
VERCEL_URL="https://fintrack-web.vercel.app"
ENDPOINT="$VERCEL_URL/api/notifications/check-bills-due-tomorrow"
CRON_SECRET="${CRON_SECRET:-test-secret-123}"

echo "📡 URL: $ENDPOINT"
echo ""

# Teste sem autenticação
echo "Teste 1: Sem autenticação (deve retornar 401)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$ENDPOINT" \
  -H "Content-Type: application/json" \
  --max-time 10 2>/dev/null)

echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Endpoint encontrado e funcionando!"
elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "405" ]; then
    echo "   ⚠️  Endpoint não encontrado ou não acessível"
    echo "   💡 Possíveis causas:"
    echo "      - Deploy ainda não completou"
    echo "      - Problema com build do Next.js"
    echo "      - Cache do Vercel"
else
    echo "   ⚠️  Status inesperado: $HTTP_CODE"
fi

echo ""
echo "Teste 2: Com autenticação"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  --max-time 10 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "   Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Sucesso! Endpoint funcionando perfeitamente!"
    echo ""
    echo "   Resposta:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "   ⚠️  Token inválido (mas endpoint funciona)"
    echo "   💡 Use o CRON_SECRET correto do GitHub Secrets"
elif [ -n "$HTTP_CODE" ] && [ "$HTTP_CODE" != "000" ]; then
    echo "   ⚠️  Status: $HTTP_CODE"
    if [ -n "$BODY" ]; then
        echo "   Resposta: $BODY"
    fi
else
    echo "   ❌ Erro de conexão"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Teste concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   1. Configure APP_URL no GitHub Secrets (se ainda não configurou)"
echo "   2. Configure CRON_SECRET no GitHub Secrets"
echo "   3. Teste via GitHub Actions: Run workflow"
echo ""



