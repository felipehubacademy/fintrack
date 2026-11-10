#!/bin/bash

# Script para testar o endpoint localmente
# Uso: ./test-local-endpoint.sh

echo "🧪 Teste Local do Endpoint check-bills-due-tomorrow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Carregar variáveis de ambiente se existir .env.local
if [ -f web/.env.local ]; then
  echo "📋 Carregando variáveis de web/.env.local..."
  export $(grep -v '^#' web/.env.local | xargs)
fi

# URLs para testar
URLS=(
  "http://localhost:3000"
  "https://fintrack-web.vercel.app"
  "https://meuazulao.com.br"
)

CRON_SECRET="${CRON_SECRET:-test-secret-123}"

for BASE_URL in "${URLS[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Testando: $BASE_URL"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  ENDPOINT="$BASE_URL/api/notifications/check-bills-due-tomorrow"
  
  # Teste 1: Sem autenticação (deve retornar 401)
  echo ""
  echo "1️⃣ Teste sem autenticação (esperado: 401):"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$ENDPOINT" \
    -H "Content-Type: application/json" \
    --max-time 5 2>/dev/null)
  
  if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Status: $HTTP_CODE (Endpoint encontrado!)"
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ Status: $HTTP_CODE (Endpoint não encontrado)"
  elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ⚠️  Status: $HTTP_CODE (Timeout ou conexão recusada)"
  else
    echo "   ⚠️  Status: $HTTP_CODE"
  fi
  
  # Teste 2: Com autenticação
  echo ""
  echo "2️⃣ Teste com autenticação (esperado: 200 ou 401 se token inválido):"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRON_SECRET" \
    --max-time 5 2>/dev/null)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Status: $HTTP_CODE (Sucesso!)"
    echo ""
    echo "   📄 Resposta completa:"
    curl -s -X POST \
      "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $CRON_SECRET" \
      --max-time 5 | jq '.' 2>/dev/null || curl -s -X POST \
      "$ENDPOINT" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $CRON_SECRET" \
      --max-time 5
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "   ⚠️  Status: $HTTP_CODE (Token inválido - mas endpoint funciona!)"
  else
    echo "   ⚠️  Status: $HTTP_CODE"
  fi
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Teste concluído!"
echo ""
echo "💡 Para testar localmente com servidor rodando:"
echo "   cd web && npm run dev"
echo "   # Em outro terminal:"
echo "   CRON_SECRET='seu-token' ./test-local-endpoint.sh"



