# Repositórios para Logos das Bandeiras de Cartão

## 🎯 Repositórios Recomendados

### ✅ Opção 1: Wikimedia Commons (Mais Completo)

**URL**: https://commons.wikimedia.org/wiki/Category:SVG_logos_of_payment_cards

**Vantagens:**
- ✅ Gratuito
- ✅ Domínio público ou licenças permissivas
- ✅ Tem TODAS as principais bandeiras
- ✅ Formatos SVG e PNG disponíveis
- ✅ Alta qualidade

**Bandeiras disponíveis:**
- ✅ Visa
- ✅ Mastercard
- ✅ American Express
- ✅ Elo
- ✅ Diners Club
- ✅ Discover
- ✅ JCB
- ✅ Hipercard (alguns)

**Como usar:**
1. Acesse o link acima
2. Procure pela bandeira desejada
3. Baixe o SVG ou PNG
4. Converta para PNG se necessário (200x60px)
5. Coloque em `packages/mobile/src/assets/card-brands/`

---

### ✅ Opção 2: Sites Oficiais das Bandeiras

#### Visa
- **URL**: https://brand.visa.com/
- **Seção**: Brand Center → Logos
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### Mastercard
- **URL**: https://brand.mastercard.com/
- **Seção**: Brand Assets → Logos
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### Elo
- **URL**: https://elo.com.br/para-voce/elo-para-desenvolvedores
- **Seção**: Recursos para Desenvolvedores → Logos
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### American Express
- **URL**: https://www.americanexpress.com/us/legal/logo-center.html
- **Requer**: Registro/login
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

---

### ✅ Opção 3: Icon-Icons

**URL**: https://icon-icons.com/pt/icones/busca/bandeiras%2Bcartoes%2Bde%2Bcredito

**Vantagens:**
- ✅ Grande variedade
- ✅ Formatos SVG, PNG, ICO

**Desvantagens:**
- ⚠️ Verificar licenças individuais

---

## 📋 Nomenclatura dos Arquivos

Use estes nomes exatos (minúsculas) em `packages/mobile/src/assets/card-brands/`:

- `visa.png`
- `mastercard.png`
- `amex.png`
- `elo.png`
- `hipercard.png`
- `diners.png`
- `discover.png`
- `jcb.png`

## ✅ Após Adicionar as Imagens

1. Descomente o código em `CardBrandIcon.js` (função `getBrandImageSource`)
2. Os logos aparecerão automaticamente nos cartões!

## 🚀 Conversão SVG → PNG

### Online:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

### Terminal (ImageMagick):
```bash
convert visa.svg -resize 200x60 visa.png
```

