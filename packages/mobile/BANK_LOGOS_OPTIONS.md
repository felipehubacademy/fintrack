# Opções para Logos de Bancos

## 🎯 Opção 1: Simple Icons (Recomendado - Biblioteca NPM)

**Biblioteca**: `simple-icons`  
**NPM**: https://www.npmjs.com/package/simple-icons  
**Site**: https://simpleicons.org/

### Vantagens:
- ✅ Biblioteca NPM oficial
- ✅ Mais de 2000 logos incluindo bancos brasileiros
- ✅ Formatos SVG prontos para uso
- ✅ Licença: CC0 1.0 (domínio público)
- ✅ Fácil integração com React Native SVG

### Bancos disponíveis:
- Nubank
- Itaú
- Bradesco
- Banco do Brasil
- Santander
- Inter
- C6 Bank
- E muitos outros...

### Instalação:
```bash
npm install simple-icons
```

### Uso:
```javascript
import { siNubank, siItau, siBradesco } from 'simple-icons';
import Svg, { Path } from 'react-native-svg';

// O SVG está em siNubank.path
```

---

## 🎯 Opção 2: Repositório GitHub "Bancos-em-SVG"

**Repositório**: https://github.com/Tgentil/Bancos-em-SVG

### Vantagens:
- ✅ Focado em bancos brasileiros
- ✅ SVGs de alta qualidade
- ✅ Gratuito
- ✅ Fácil de baixar e usar

### Desvantagens:
- ⚠️ Não é uma biblioteca NPM (precisa baixar manualmente)
- ⚠️ Precisa verificar licenças individuais

### Como usar:
1. Clone ou baixe o repositório
2. Copie os SVGs para `packages/mobile/src/assets/banks/`
3. Use com `react-native-svg`

---

## 🎯 Opção 3: Wikimedia Commons

**Site**: https://commons.wikimedia.org/wiki/Category:Logos_of_banks

### Vantagens:
- ✅ Grande variedade
- ✅ Geralmente em domínio público ou licenças permissivas

### Desvantagens:
- ⚠️ Precisa baixar manualmente
- ⚠️ Qualidade variável
- ⚠️ Precisa verificar licença de cada logo

---

## 🎯 Opção 4: Criar componente próprio

Usar `react-native-svg` para criar componentes SVG inline dos logos.

### Vantagens:
- ✅ Controle total
- ✅ Sem dependências externas
- ✅ Otimizado para sua app

### Desvantagens:
- ⚠️ Trabalhoso criar todos os logos
- ⚠️ Precisa manter atualizado

---

## 💡 Recomendação

**Use Simple Icons** porque:
1. É uma biblioteca NPM oficial
2. Tem muitos bancos brasileiros
3. Licença permissiva (CC0)
4. Fácil de integrar
5. Bem mantida

Se algum banco específico não estiver disponível no Simple Icons, complemente com o repositório GitHub "Bancos-em-SVG".

