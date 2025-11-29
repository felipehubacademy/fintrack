#!/bin/bash
# Script para remover duplicação do React que o Expo CLI instala

echo "🔍 Verificando cópias do React..."

REACT_COPIES=$(find node_modules -type d -name "react" ! -path "*/react-*" ! -path "*/java/*" 2>/dev/null | wc -l | tr -d ' ')

if [ "$REACT_COPIES" -gt 1 ]; then
    echo "⚠️  Encontradas $REACT_COPIES cópias do React"
    echo "🧹 Removendo cópias duplicadas..."
    
    # Remover React canary do Expo CLI
    if [ -d "node_modules/expo/node_modules/@expo/cli/static/canary-full/node_modules/react" ]; then
        rm -rf node_modules/expo/node_modules/@expo/cli/static/canary-full/node_modules/react
        echo "   ✅ Removida cópia canary do Expo CLI"
    fi
    
    # Verificar novamente
    REACT_COPIES_AFTER=$(find node_modules -type d -name "react" ! -path "*/react-*" ! -path "*/java/*" 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$REACT_COPIES_AFTER" -eq 1 ]; then
        echo "✅ Agora existe apenas 1 cópia do React"
        echo "📱 Pode iniciar o Expo: npm start"
    else
        echo "❌ Ainda existem $REACT_COPIES_AFTER cópias. Execute npm run clean"
    fi
else
    echo "✅ Perfeito! Apenas 1 cópia do React encontrada"
    echo "📱 Pronto para iniciar: npm start"
fi

