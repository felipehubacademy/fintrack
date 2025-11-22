# @fintrack/shared

Pacote compartilhado entre Web (Next.js) e Mobile (React Native/Expo).

## 📦 Conteúdo

### API (`src/api`)
- `supabaseClient.js` - Cliente Supabase configurado para Web e Mobile

### Utils (`src/utils`)
- `dateUtils.js` - Funções para manipulação de datas (fuso horário Brasil)
  - `getBrazilDate()` - Data atual no fuso BR
  - `getBrazilToday()` - Data de hoje sem hora
  - `getBrazilTodayString()` - Hoje em formato YYYY-MM-DD
  - `formatDateBR()` - Formata data como DD/MM/YYYY
  - `formatCurrency()` - Formata valores em R$

### Constants (`src/constants`)
- `config.js` - Configurações da aplicação
  - URLs base
  - Configurações de domínio
  - Emails de notificação

## 🔧 Uso

### No Web (Next.js)

```javascript
import { supabase } from '@fintrack/shared/api';
import { formatCurrency, getBrazilToday } from '@fintrack/shared/utils';
import { APP_CONFIG } from '@fintrack/shared/constants';

// Usar Supabase
const { data } = await supabase.from('expenses').select('*');

// Formatar moeda
const formatted = formatCurrency(1234.56); // "R$ 1.234,56"

// Obter data de hoje
const today = getBrazilToday();
```

### No Mobile (React Native)

```javascript
import { supabase } from '@fintrack/shared/api';
import { formatCurrency } from '@fintrack/shared/utils';

// Mesmo código funciona no mobile!
const { data } = await supabase.from('expenses').select('*');
const formatted = formatCurrency(1234.56);
```

## ⚙️ Variáveis de Ambiente

O cliente Supabase detecta automaticamente variáveis de diferentes plataformas:

**Next.js**:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Expo/React Native**:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**Node.js**:
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

## 📝 Adicionar Novo Código Compartilhado

1. Crie o arquivo em `src/[categoria]/`
2. Exporte no arquivo `index.js` da categoria
3. Use nos projetos web/mobile

Exemplo:
```javascript
// src/utils/myUtil.js
export function myNewFunction() {
  return 'Hello!';
}

// src/utils/index.js
export * from './dateUtils.js';
export * from './myUtil.js'; // adicionar aqui

// Usar em web ou mobile
import { myNewFunction } from '@fintrack/shared/utils';
```

## 🧪 Testes

```bash
npm test
```

## 📄 Licença

Privado - Uso exclusivo do projeto FinTrack

