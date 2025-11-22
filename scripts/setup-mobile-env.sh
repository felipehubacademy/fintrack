#!/bin/bash

# Script para configurar o .env do mobile com as credenciais do web

echo "🔧 Configurando variáveis de ambiente do Mobile..."
echo ""

# Verificar se o .env.local do web existe
if [ ! -f "packages/web/.env.local" ]; then
    echo "❌ Arquivo packages/web/.env.local não encontrado"
    echo "Por favor, configure primeiro o .env.local do web"
    exit 1
fi

# Ler as variáveis do web
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL packages/web/.env.local | cut -d '=' -f2)
SUPABASE_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY packages/web/.env.local | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Não foi possível encontrar as variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "Verifique o arquivo packages/web/.env.local"
    exit 1
fi

# Criar o .env do mobile
cat > packages/mobile/.env << EOF
# Supabase Configuration
# Copiado automaticamente de packages/web/.env.local

EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Estas credenciais são as mesmas do Web para compartilhar:
# - Mesmos usuários (login funciona em ambas plataformas)
# - Mesmos dados (transações, despesas, etc)
# - Real-time sync automático
EOF

echo "✅ Arquivo packages/mobile/.env criado com sucesso!"
echo ""
echo "📱 Próximos passos:"
echo "   1. Execute: npm run dev:mobile"
echo "   2. Instale o app Expo Go no seu celular"
echo "   3. Escaneie o QR code"
echo "   4. Faça login com suas credenciais"
echo ""
echo "🎉 Pronto para desenvolver!"

