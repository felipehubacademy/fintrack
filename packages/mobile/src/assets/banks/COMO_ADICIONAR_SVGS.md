# 📋 Como Adicionar Logos SVG dos Bancos

## ✅ Estrutura Criada

O código já está pronto para usar SVGs! Você só precisa adicionar o conteúdo dos seus arquivos SVG.

## 📝 Passo a Passo

### Opção A: Script Automático (Recomendado) 🚀

1. **Coloque seus arquivos SVG** na pasta `packages/mobile/src/assets/banks/`
   - Exemplo: `nubank.svg`, `itau.svg`, `bradesco.svg`, etc.

2. **Execute o script:**
   ```bash
   node packages/mobile/scripts/convert-svgs-to-js.js
   ```

3. **Pronto!** O script converte automaticamente todos os SVGs para o formato JavaScript.

---

### Opção B: Manual ✏️

### 1. Abra o arquivo de configuração

Abra: `packages/mobile/src/assets/banks/bankLogos.js`

### 2. Para cada banco, cole o conteúdo SVG

**Exemplo:**

```javascript
export const bankLogos = {
  nubank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M50 10 L90 50 L50 90 L10 50 Z" fill="#820AD1"/>
  </svg>`,
  
  itau: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
    <!-- Cole aqui o conteúdo completo do arquivo itau.svg -->
  </svg>`,
  
  // ... continue para os outros bancos
};
```

### 3. Como obter o conteúdo SVG

**Opção A: Abrir o arquivo SVG em um editor de texto**
1. Abra o arquivo `.svg` (ex: `nubank.svg`)
2. Selecione tudo (Cmd+A / Ctrl+A)
3. Copie (Cmd+C / Ctrl+C)
4. Cole no `bankLogos.js` como string template

**Opção B: Usar terminal**
```bash
# No terminal, dentro da pasta onde estão seus SVGs:
cat nubank.svg
# Copie a saída e cole no bankLogos.js
```

### 4. Nomes dos bancos suportados

Use estes nomes exatos no objeto `bankLogos`:

- `nubank`
- `itau`
- `bradesco`
- `bb` (Banco do Brasil)
- `santander`
- `inter`
- `c6`
- `caixa` (ou `caixabank` - ambos apontam para o mesmo)
- `btg`
- `original`
- `neon`
- `picpay`
- `mercadopago`
- `xp`

### 5. Teste

Após adicionar os SVGs, o componente `BankIcon` automaticamente usará eles!

```jsx
import { BankIcon } from './components/financial/BankIcon';

// Usa automaticamente o SVG se estiver em bankLogos.js
<BankIcon bankName="Nubank" size={40} />
```

## ⚠️ Importante

- **Mantenha o formato**: Cole o SVG completo incluindo a tag `<svg>...</svg>`
- **Use template strings**: Use crases (`` ` ``) ao invés de aspas simples
- **Não precisa converter**: Use os SVGs diretamente, não precisa converter para PNG
- **Qualidade**: SVGs são escaláveis e ficam perfeitos em qualquer tamanho!

## 🎨 Exemplo Completo

```javascript
export const bankLogos = {
  nubank: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <circle cx="100" cy="100" r="80" fill="#820AD1"/>
    <text x="100" y="120" text-anchor="middle" fill="white" font-size="40">NU</text>
  </svg>`,
  
  itau: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">
    <!-- Conteúdo do SVG do Itaú aqui -->
  </svg>`,
  
  // ... adicione os outros bancos
};
```

## ✅ Pronto!

Depois de adicionar os SVGs, eles aparecerão automaticamente nos cartões!

