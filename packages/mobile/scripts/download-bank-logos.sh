#!/bin/bash

# Script para baixar logos dos bancos brasileiros
# Fonte: https://github.com/Tgentil/Bancos-em-SVG

echo "📥 Baixando logos dos bancos brasileiros..."

# Criar diretório se não existir
mkdir -p packages/mobile/src/assets/banks

# Diretório temporário
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clonar repositório (apenas a pasta de SVGs)
echo "Clonando repositório Bancos-em-SVG..."
git clone --depth 1 https://github.com/Tgentil/Bancos-em-SVG.git

# Copiar logos principais
cd Bancos-em-SVG

# Lista de bancos principais
BANKS=(
  "Nubank"
  "Itau"
  "Bradesco"
  "Banco do Brasil"
  "Santander"
  "Inter"
  "C6 Bank"
  "Caixa"
  "BTG"
  "Original"
  "Neon"
  "PicPay"
  "Mercado Pago"
)

echo ""
echo "📋 Logos disponíveis no repositório:"
ls -1 *.svg | head -20

echo ""
echo "✅ Para usar os logos:"
echo "1. Escolha os SVGs que deseja usar"
echo "2. Converta para PNG se necessário (usando ferramentas online ou ImageMagick)"
echo "3. Coloque em: packages/mobile/src/assets/banks/"
echo "4. Nomeie como: nubank.png, itau.png, bradesco.png, etc."
echo ""
echo "💡 Dica: Você pode usar os SVGs diretamente convertendo para componentes React Native SVG"

# Limpar
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "✨ Concluído! Verifique o repositório clonado para ver os logos disponíveis."

