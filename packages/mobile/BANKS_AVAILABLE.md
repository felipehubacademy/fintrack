# Logos de Bancos Disponíveis

## ⚠️ Situação: Simple Icons Tem Apenas 4 Logos

Você está certo - **apenas 4 logos não é suficiente** para um app financeiro brasileiro!

## ✅ Solução: Usar Imagens Locais (Recomendado)

A melhor solução é usar o repositório GitHub **"Bancos-em-SVG"** que tem os principais bancos brasileiros.

**Repositório**: https://github.com/Tgentil/Bancos-em-SVG

---

## 📋 Logos Disponíveis no Simple Icons (Limitado)

Apenas **4 logos** estão disponíveis na biblioteca `simple-icons`:

1. **Nubank** (`siNubank`)
   - Slug: `nubank`
   - Cor: `#820AD1` (Roxo)
   - Detecta: "nubank", "nu", "roxinho"

2. **PicPay** (`siPicpay`)
   - Slug: `picpay`
   - Cor: `#21C25E` (Verde)
   - Detecta: "picpay"

3. **Mercado Pago** (`siMercadopago`)
   - Slug: `mercadopago`
   - Cor: `#00B1EA` (Azul)
   - Detecta: "mercado pago", "mercadopago"

4. **CaixaBank** (`siCaixabank`)
   - Slug: `caixabank`
   - Cor: `#007EAE` (Azul)
   - Detecta: "caixa", "caixabank", "cef"

---

## ❌ Bancos NÃO Disponíveis no Simple Icons

Estes bancos **não têm logos** no Simple Icons e usarão o fallback (ícone genérico com cor):

- Itaú
- Bradesco
- Banco do Brasil
- Santander
- Inter
- C6 Bank
- BTG Pactual
- Original
- Neon
- E outros...

---

## 💡 Solução: Usar Imagens Locais (OBRIGATÓRIO)

**O componente já está configurado para priorizar imagens locais!**

### Passo a Passo:

1. **Baixe os logos do repositório**: https://github.com/Tgentil/Bancos-em-SVG
2. **Converta SVGs para PNG** (tamanho recomendado: 200x60px)
   - Use: https://cloudconvert.com/svg-to-png
   - Ou: `convert logo.svg logo.png` (ImageMagick)
3. **Coloque em**: `packages/mobile/src/assets/banks/`
4. **Nomeie como**: `itau.png`, `bradesco.png`, `bb.png`, `santander.png`, etc.
5. **Pronto!** O componente carregará automaticamente

### Script de Ajuda:

Execute o script para ver os logos disponíveis:
```bash
bash packages/mobile/scripts/download-bank-logos.sh
```

### Opção 2: Melhorar Detecção de Nomes

O componente já detecta variações de nomes, mas você pode melhorar a detecção adicionando mais variações na função `detectBank()`.

### Opção 3: Usar Fallback com Cor

Por enquanto, bancos não disponíveis mostrarão um ícone genérico com a cor do banco (já implementado).

---

## 🔍 Como Funciona a Detecção

O componente detecta o banco pelo campo `card.bank` ou `bankName` passado. 

**Exemplos de detecção:**
- "Nubank" → Logo do Nubank ✅
- "Nu" → Logo do Nubank ✅
- "PicPay" → Logo do PicPay ✅
- "Mercado Pago" → Logo do Mercado Pago ✅
- "Caixa" → Logo do CaixaBank ✅
- "Itaú" → Ícone genérico laranja (fallback)
- "Bradesco" → Ícone genérico vermelho (fallback)

---

## 📝 Nota sobre Cadastro Manual

Se o usuário cadastrar o cartão manualmente com um nome diferente, a detecção pode falhar. 

**Sugestões:**
1. Normalizar nomes no cadastro (sugerir nomes padronizados)
2. Adicionar mais variações na função `detectBank()`
3. Permitir seleção de banco em dropdown no cadastro

