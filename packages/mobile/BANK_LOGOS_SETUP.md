# Setup de Logos dos Bancos Brasileiros

## 🎯 Situação Atual

O `simple-icons` tem apenas **4 logos** de bancos brasileiros:
- ✅ Nubank
- ✅ PicPay  
- ✅ Mercado Pago
- ✅ CaixaBank

**Isso não é suficiente para um app financeiro brasileiro!**

---

## ✅ Solução Recomendada: Usar Imagens Locais

### Opção 1: Repositório GitHub "Bancos-em-SVG" (Recomendado)

**Repositório**: https://github.com/Tgentil/Bancos-em-SVG

**Vantagens:**
- ✅ Focado em bancos brasileiros
- ✅ SVGs de alta qualidade
- ✅ Gratuito
- ✅ Tem os principais bancos

**Como usar:**

1. **Baixar os logos:**
   ```bash
   # Clone o repositório
   git clone https://github.com/Tgentil/Bancos-em-SVG.git
   
   # Ou baixe manualmente do GitHub
   ```

2. **Converter SVGs para PNG (se necessário):**
   - Use ferramentas online: https://cloudconvert.com/svg-to-png
   - Ou use ImageMagick: `convert logo.svg logo.png`

3. **Organizar os arquivos:**
   ```
   packages/mobile/src/assets/banks/
   ├── nubank.png
   ├── itau.png
   ├── bradesco.png
   ├── bb.png
   ├── santander.png
   ├── inter.png
   ├── c6.png
   ├── caixa.png
   ├── btg.png
   ├── original.png
   ├── neon.png
   ├── picpay.png
   └── mercadopago.png
   ```

4. **O componente carregará automaticamente!**

---

### Opção 2: Usar SVGs Diretamente (Melhor Qualidade)

Se você quiser usar SVGs diretamente (melhor qualidade e escalabilidade):

1. Baixe os SVGs do repositório
2. Crie componentes React Native SVG para cada banco
3. Ou use uma biblioteca como `react-native-svg-transformer`

---

## 📋 Bancos Principais que Devem Ter Logo

### Bancos Tradicionais
- [ ] Itaú
- [ ] Bradesco
- [ ] Banco do Brasil
- [ ] Santander
- [ ] Caixa Econômica Federal

### Bancos Digitais
- [x] Nubank (Simple Icons)
- [ ] Inter
- [ ] C6 Bank
- [ ] Original
- [ ] Neon

### Fintechs/Pagamentos
- [x] PicPay (Simple Icons)
- [x] Mercado Pago (Simple Icons)
- [ ] PagSeguro
- [ ] Stone

### Outros
- [ ] BTG Pactual
- [ ] XP Investimentos
- [ ] Rico

---

## 🚀 Próximos Passos

1. **Imediato**: Baixar logos do repositório GitHub
2. **Converter para PNG** (tamanho recomendado: 200x60px)
3. **Adicionar em `packages/mobile/src/assets/banks/`**
4. **Testar** - o componente já está pronto para usar!

---

## 💡 Alternativa: Remover Simple Icons?

Se você vai usar apenas imagens locais, pode considerar remover `simple-icons`:

```bash
npm uninstall simple-icons
```

O componente continuará funcionando, apenas usando imagens locais e fallback com cores.

---

## 📝 Nota Legal

Verifique as licenças dos logos antes de usar em produção. O repositório GitHub geralmente tem logos em domínio público ou com licenças permissivas, mas sempre verifique!

