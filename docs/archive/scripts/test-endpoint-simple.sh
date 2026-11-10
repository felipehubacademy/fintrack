#!/bin/bash
# Teste simples do endpoint

echo "🔍 Testando endpoint..."
echo "URL: https://meuazulao.com.br/api/notifications/check-bills-due-tomorrow"
echo ""

# Teste sem autenticação (deve retornar 401)
echo "1️⃣ Teste sem autenticação (deve retornar 401):"
curl -s -o /dev/null -w "Status: %{http_code}\n" -X POST \
  "https://meuazulao.com.br/api/notifications/check-bills-due-tomorrow" \
  -H "Content-Type: application/json" \
  --max-time 5

echo ""
echo "2️⃣ Teste com GET (deve retornar 405):"
curl -s -o /dev/null -w "Status: %{http_code}\n" \
  "https://meuazulao.com.br/api/notifications/check-bills-due-tomorrow" \
  --max-time 5

echo ""
echo "✅ Se retornou 401 ou 405, o endpoint está funcionando!"
echo "❌ Se retornou 404, o endpoint não foi encontrado."
echo "❌ Se retornou 000 ou timeout, há problema de conexão."



