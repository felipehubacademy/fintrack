# 🏗️ ARQUITETURA V2 - FINTRACK COMPLETO

## 📊 VISÃO GERAL

### Estrutura de Navegação
```
/dashboard (HOME)
├── Cards resumo (Cartões + Despesas + Total)
├── Gráficos do mês atual
└── Comparativo mensal (histórico)

/dashboard/card
├── Transações do cartão de crédito
├── Tabela com edição inline
└── Totais por pessoa (Felipe/Letícia/Compartilhado)

/dashboard/finance
├── Despesas gerais (A vista)
├── Categorização automática
└── Totais por pessoa e categoria
```

---

## 💾 ESTRUTURA DE DADOS

### Tabela Atual: `expenses` (Cartão de Crédito)
```sql
- id
- pluggy_transaction_id
- date
- description
- amount
- category
- owner (Felipe/Leticia/Compartilhado)
- status (pending/confirmed/ignored)
- split
- source (pluggy/manual)
- payment_method: 'credit_card' (fixo)
```

### Nova Tabela: `expenses_general` (Despesas Gerais)
```sql
CREATE TABLE expenses_general (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  owner TEXT CHECK (owner IN ('Felipe', 'Leticia', 'Compartilhado')),
  status TEXT DEFAULT 'pending',
  split BOOLEAN DEFAULT false,
  payment_method TEXT CHECK (payment_method IN ('cash', 'debit', 'pix', 'other')),
  whatsapp_message_id TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### View Unificada: `all_expenses`
```sql
CREATE VIEW all_expenses AS
  SELECT 
    id, date, description, amount, category, owner, 
    status, split, 'credit_card' as payment_method, 
    'card' as source_type, created_at
  FROM expenses
  UNION ALL
  SELECT 
    id, date, description, amount, category, owner,
    status, split, payment_method,
    'general' as source_type, created_at
  FROM expenses_general
  ORDER BY date DESC;
```

---

## 🤖 FLUXO DO WHATSAPP

### 1. Detecção de Mensagem
```javascript
// backend/services/whatsapp.js - parseExpenseInput()
Input: "Gastei 300,50 no posto de gasolina"

Parse:
- amount: 300.50
- description: "posto de gasolina"
- category: "Combustível" (IA/keywords)
```

### 2. Conversação (Estado)
```javascript
// Usar tabela: conversation_state
{
  user_phone: '+5511...',
  state: 'awaiting_payment_method', // ou 'awaiting_owner'
  temp_data: {
    amount: 300.50,
    description: 'posto de gasolina',
    category: 'Combustível'
  },
  last_message_id: 'wamid...',
  created_at: timestamp
}
```

### 3. Templates do WhatsApp

#### Template 1: `fintrack_payment_method`
```
Certo, você gastou R$ {{amount}} em {{category}}.

Esse gasto foi em:
- Cartão de crédito
- A vista
```
**Buttons:** `[Cartão de crédito] [A vista]`

#### Template 2: `fintrack_choose_owner`
```
Entendi, R$ {{amount}} em {{category}} - {{payment_method}}.

Quem é responsável por esse gasto?
```
**Buttons:** `[Felipe] [Letícia] [Compartilhado]`

#### Template 3: `fintrack_expense_confirmed` (já existe)
```
Despesa Confirmada
Despesa registrada com sucesso!

Valor: R$ {{amount}}
Responsável: {{owner}}
Data: {{date}}

Totais do mês:
Cartão de Crédito: R$ {{card_total}}
A Vista: R$ {{cash_total}}
TOTAL: R$ {{total}}
```

---

## 🎨 FRONTEND

### 1. Dashboard Home (`/dashboard`)
```jsx
// web/pages/dashboard/index.jsx
<Dashboard>
  {/* Cards Resumo */}
  <SummaryCards>
    <Card title="Cartões" value={cardTotal} />
    <Card title="A Vista" value={cashTotal} />
    <Card title="TOTAL GERAL" value={total} highlight />
  </SummaryCards>

  {/* Gráficos Mês Atual */}
  <CurrentMonthCharts>
    <PieChart data={byCategory} />
    <BarChart data={byPerson} />
  </CurrentMonthCharts>

  {/* Comparativo Mensal */}
  <MonthlyComparison>
    <LineChart data={monthlyTotals} />
  </MonthlyComparison>

  {/* Navigation */}
  <QuickActions>
    <Link href="/dashboard/card">Ver Cartões</Link>
    <Link href="/dashboard/finance">Ver Despesas</Link>
  </QuickActions>
</Dashboard>
```

### 2. Dashboard Cartões (`/dashboard/card`)
```jsx
// web/pages/dashboard/card.jsx
<CardDashboard>
  <SummaryCards expenses={cardExpenses} />
  <ExpenseTable 
    expenses={cardExpenses} 
    type="card"
    onUpdate={refresh}
  />
  <Chart expenses={cardExpenses} />
</CardDashboard>
```

### 3. Dashboard Despesas (`/dashboard/finance`)
```jsx
// web/pages/dashboard/finance.jsx
<FinanceDashboard>
  <SummaryCards expenses={generalExpenses} />
  <ExpenseTable 
    expenses={generalExpenses} 
    type="general"
    onUpdate={refresh}
    showPaymentMethod // mostrar coluna forma de pagamento
  />
  <Chart expenses={generalExpenses} />
</FinanceDashboard>
```

---

## 🔧 BACKEND

### 1. API Routes

#### `/api/expenses/card` (já existe como `/api/check`)
- GET: Listar despesas de cartão
- POST: Criar despesa manual de cartão

#### `/api/expenses/general` (NOVO)
- GET: Listar despesas gerais
- POST: Criar despesa geral
- PUT: Atualizar despesa geral

#### `/api/expenses/summary` (NOVO)
```javascript
// Retorna totais consolidados
{
  card: {
    felipe: 1500,
    leticia: 1200,
    shared: 800,
    total: 3500
  },
  general: {
    felipe: 500,
    leticia: 300,
    shared: 200,
    total: 1000
  },
  grandTotal: 4500,
  byCategory: {
    'Combustível': 300,
    'Alimentação': 800,
    ...
  }
}
```

### 2. WhatsApp Service (Conversação)

```javascript
// backend/services/whatsappConversation.js

class WhatsAppConversation {
  async handleIncomingMessage(message) {
    const text = message.text.body;
    const from = message.from;
    
    // Buscar estado da conversa
    const state = await this.getConversationState(from);
    
    if (!state) {
      // Nova conversa - tentar parsear despesa
      const expense = this.parseExpenseInput(text);
      
      if (expense) {
        // Salvar estado
        await this.saveState(from, 'awaiting_payment_method', expense);
        
        // Enviar template de escolha de pagamento
        await this.sendPaymentMethodTemplate(from, expense);
      } else {
        await this.sendHelpMessage(from);
      }
    } else if (state.state === 'awaiting_payment_method') {
      // Processar escolha de pagamento
      const paymentMethod = this.parsePaymentMethod(text);
      state.temp_data.payment_method = paymentMethod;
      
      await this.saveState(from, 'awaiting_owner', state.temp_data);
      await this.sendOwnerTemplate(from, state.temp_data);
      
    } else if (state.state === 'awaiting_owner') {
      // Processar escolha de owner
      const owner = this.parseOwner(text);
      
      // Salvar despesa
      await this.saveGeneralExpense({
        ...state.temp_data,
        owner,
        date: new Date()
      });
      
      // Enviar confirmação
      const totals = await this.getMonthlyTotals(owner);
      await this.sendConfirmationTemplate(from, state.temp_data, owner, totals);
      
      // Limpar estado
      await this.clearState(from);
    }
  }
  
  parseExpenseInput(text) {
    // Regex para extrair valor e descrição
    // "Gastei 300,50 no posto" → { amount: 300.50, description: 'posto' }
    const regex = /gastei\s+(\d+[,.]?\d*)\s+(?:no|na|em)\s+(.+)/i;
    const match = text.match(regex);
    
    if (match) {
      return {
        amount: parseFloat(match[1].replace(',', '.')),
        description: match[2],
        category: this.categorize(match[2])
      };
    }
    
    return null;
  }
  
  categorize(description) {
    const keywords = {
      'Combustível': ['posto', 'gasolina', 'alcool', 'shell', 'ipiranga'],
      'Alimentação': ['restaurante', 'lanche', 'pizza', 'comida'],
      'Supermercado': ['mercado', 'extra', 'carrefour'],
      // ...
    };
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(w => description.toLowerCase().includes(w))) {
        return category;
      }
    }
    
    return 'Outros';
  }
}
```

---

## 📈 IMPLEMENTAÇÃO (FASES)

### Fase 1: Estrutura de Dados ✅ (Já temos)
- [x] Tabela `expenses` (cartões)
- [ ] Criar tabela `expenses_general`
- [ ] Criar tabela `conversation_state`
- [ ] Criar view `all_expenses`

### Fase 2: Backend API
- [ ] `/api/expenses/general` (CRUD)
- [ ] `/api/expenses/summary` (totais consolidados)
- [ ] `whatsappConversation.js` (fluxo de conversa)

### Fase 3: Templates WhatsApp
- [ ] Criar `fintrack_payment_method`
- [ ] Criar `fintrack_choose_owner`
- [ ] Atualizar `fintrack_expense_confirmed`

### Fase 4: Frontend
- [ ] Refatorar `/dashboard` para ser home
- [ ] Criar `/dashboard/card`
- [ ] Criar `/dashboard/finance`
- [ ] Componentes de gráficos mensais
- [ ] Comparativo histórico

### Fase 5: Integração
- [ ] Webhook WhatsApp processa conversas
- [ ] Testar fluxo completo
- [ ] Deploy

---

## 🎯 MELHORIAS FUTURAS

1. **IA/NLP** para melhor categorização
2. **Anexos** (fotos de nota fiscal)
3. **Orçamento** por categoria
4. **Alertas** de gastos excessivos
5. **Export** para Excel/PDF
6. **Múltiplos cartões** (Itaú, Nubank, etc)
7. **Contas a pagar** (boletos, recorrentes)

---

## 🚀 PRÓXIMOS PASSOS

Quer começar por qual fase?
1. Criar as tabelas no Supabase
2. Implementar o backend (APIs)
3. Criar templates WhatsApp
4. Desenvolver frontend

Me diga por onde começamos! 🎯

