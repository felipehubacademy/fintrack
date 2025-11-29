# Referência Rápida - Logos dos Bancos

## 🔗 Link do Repositório

**GitHub**: https://github.com/Tgentil/Bancos-em-SVG

## 📥 Download Rápido

1. Acesse: https://github.com/Tgentil/Bancos-em-SVG
2. Clique em **"Code"** → **"Download ZIP"**
3. Extraia o arquivo
4. Encontre os SVGs dos bancos que você precisa

## 🎨 Conversão SVG → PNG

### Online (Recomendado):
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

### Via Terminal (ImageMagick):
```bash
convert banco.svg -resize 200x60 banco.png
```

## 📋 Mapeamento de Nomes

| Banco | Nome do Arquivo | Detecta |
|-------|----------------|---------|
| Nubank | `nubank.png` | "nubank", "nu" |
| Itaú | `itau.png` | "itau", "itaú" |
| Bradesco | `bradesco.png` | "bradesco" |
| Banco do Brasil | `bb.png` | "banco do brasil", "bb" |
| Santander | `santander.png` | "santander" |
| Inter | `inter.png` | "inter", "banco inter" |
| C6 Bank | `c6.png` | "c6", "c6 bank" |
| Caixa | `caixa.png` | "caixa", "cef" |
| BTG | `btg.png` | "btg" |
| Original | `original.png` | "original" |
| Neon | `neon.png` | "neon" |
| PicPay | `picpay.png` | "picpay" |
| Mercado Pago | `mercadopago.png` | "mercado pago", "mercadopago" |

## ✅ Checklist

- [ ] Baixar repositório GitHub
- [ ] Converter SVGs para PNG (200x60px)
- [ ] Renomear arquivos conforme tabela acima
- [ ] Colocar nesta pasta (`packages/mobile/src/assets/banks/`)
- [ ] Testar no app!

## 🚀 Após Adicionar

O componente `BankIcon` detectará automaticamente e mostrará o logo quando o banco for reconhecido pelo nome cadastrado no cartão.

