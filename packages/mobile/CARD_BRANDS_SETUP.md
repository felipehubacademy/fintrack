# Setup de Logos das Bandeiras de Cartão

## 🔗 Onde Baixar os Logos

### ✅ Opção 1: Wikimedia Commons (Recomendado - Gratuito)

**URL**: https://commons.wikimedia.org/wiki/Category:SVG_logos_of_payment_cards

**Vantagens:**
- ✅ Gratuito
- ✅ Domínio público ou licenças permissivas
- ✅ Tem todas as principais bandeiras
- ✅ Formatos SVG e PNG disponíveis

**Bandeiras disponíveis:**
- Visa
- Mastercard
- American Express
- Elo
- Diners Club
- Discover
- JCB
- Hipercard (alguns)

---

### ✅ Opção 2: Sites Oficiais das Bandeiras

#### Visa
- **Site**: https://brand.visa.com/
- **Seção**: Brand Center → Logos
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### Mastercard
- **Site**: https://brand.mastercard.com/
- **Seção**: Brand Assets → Logos
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### Elo
- **Site**: https://elo.com.br/para-voce/elo-para-desenvolvedores
- **Seção**: Recursos para Desenvolvedores → Logos
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### American Express
- **Site**: https://www.americanexpress.com/us/legal/logo-center.html
- **Requer**: Registro/login
- **Formato**: PNG ou SVG
- **Licença**: Verificar termos de uso

#### Hipercard
- **Site**: https://www.hipercard.com.br/
- **Contato**: Necessário para uso comercial
- **Formato**: PNG ou SVG

---

### ✅ Opção 3: Icon-Icons

**URL**: https://icon-icons.com/pt/icones/busca/bandeiras%2Bcartoes%2Bde%2Bcredito

**Vantagens:**
- ✅ Grande variedade
- ✅ Formatos SVG, PNG, ICO

**Desvantagens:**
- ⚠️ Verificar licenças individuais

---

## 📁 Estrutura de Pastas

Após baixar os logos, organize assim:

```
packages/mobile/src/assets/card-brands/
├── visa.png (ou .svg)
├── mastercard.png
├── amex.png
├── elo.png
├── hipercard.png
├── diners.png
├── discover.png
└── jcb.png
```

## 🎨 Especificações Recomendadas

- **Formato**: PNG com fundo transparente ou SVG
- **Tamanho**: Mínimo 200x60px (para qualidade)
- **Cor**: Versão colorida oficial
- **Fundo**: Transparente (PNG) ou sem fundo (SVG)

## 📋 Nomenclatura dos Arquivos

Use estes nomes exatos (minúsculas):

| Bandeira | Nome do Arquivo | Detecta |
|----------|----------------|---------|
| Visa | `visa.png` | "visa" |
| Mastercard | `mastercard.png` | "master", "mastercard" |
| American Express | `amex.png` | "amex", "american express" |
| Elo | `elo.png` | "elo" |
| Hipercard | `hipercard.png` | "hipercard", "hiper" |
| Diners Club | `diners.png` | "diners", "diners club" |
| Discover | `discover.png` | "discover" |
| JCB | `jcb.png` | "jcb" |

## ✅ Após Adicionar

O componente `CardBrandIcon` detectará automaticamente e mostrará o logo quando a bandeira for reconhecida pelo nome do cartão.

## 🚀 Conversão SVG → PNG

### Online (Recomendado):
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/

### Via Terminal (ImageMagick):
```bash
convert visa.svg -resize 200x60 visa.png
```

## 📝 Nota Legal

Verifique as licenças dos logos antes de usar em produção. Os sites oficiais geralmente permitem uso em apps, mas sempre verifique os termos de uso!
