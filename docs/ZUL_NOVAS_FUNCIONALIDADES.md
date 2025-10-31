# Guia: Adicionar Novas Funcionalidades ao ZUL

Este documento explica como expandir as capacidades do ZUL para incluir:
- ✅ Registrar entradas/receitas (incomes)
- ✅ Enviar resumo de despesas
- ✅ Resumo por categoria
- ✅ Consultas como "quanto já gastei de alimentação esse mês?"

---

## 📋 Estrutura Atual

### 1. Funções Disponíveis
**Arquivo:** `backend/services/zulAssistant.js`

As funções são definidas no método `getFunctions()` (linha ~1431):
```javascript
getFunctions() {
  return [
    {
      name: 'save_expense',
      description: 'Salvar despesa...',
      parameters: { ... }
    }
  ];
}
```

### 2. Processamento de Funções
As funções chamadas pelo GPT são processadas em `handleFunctionCall()` (linha ~1631):
```javascript
async handleFunctionCall(functionName, functionArgs, context) {
  if (functionName === 'save_expense') {
    // Processar despesa
  }
  // Adicionar novos cases aqui
}
```

---

## 🚀 Implementação Passo a Passo

### PASSO 1: Adicionar Nova Função ao `getFunctions()`

```javascript
getFunctions() {
  return [
    {
      name: 'save_expense',
      // ... existente
    },
    // ✅ NOVA FUNÇÃO: Registrar Entrada/Receita
    {
      name: 'save_income',
      description: 'Registrar entrada/receita quando o usuário mencionar valores recebidos (ex: "recebi comissão de 200 reais", "salário", "freelance").',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Valor numérico da entrada/receita'
          },
          description: {
            type: 'string',
            description: 'Descrição da entrada (ex: "comissão", "salário", "freelance", "venda")'
          },
          category: {
            type: 'string',
            description: 'Categoria da entrada (ex: "Salário", "Comissão", "Freelance", "Venda")'
          },
          account_name: {
            type: 'string',
            description: 'Nome da conta bancária onde o dinheiro foi recebido (ex: "Nubank", "C6"). Se não informado, usar conta padrão.'
          },
          responsible: {
            type: 'string',
            description: 'Quem recebeu: nome exato ou "eu"'
          },
          date: {
            type: 'string',
            description: 'Data da entrada no formato YYYY-MM-DD (opcional, default: hoje)'
          }
        },
        required: ['amount', 'description', 'responsible']
      }
    },
    // ✅ NOVA FUNÇÃO: Obter Resumo de Despesas
    {
      name: 'get_expenses_summary',
      description: 'Obter resumo de despesas quando o usuário perguntar "quanto gastei?", "resumo de despesas", "quanto já gastei esse mês?", etc.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Período: "hoje", "esta_semana", "este_mes", "mes_anterior", ou data específica (YYYY-MM)',
            enum: ['hoje', 'esta_semana', 'este_mes', 'mes_anterior']
          },
          category: {
            type: 'string',
            description: 'Categoria específica para filtrar (opcional, ex: "Alimentação", "Transporte"). Se não informado, retorna todas as categorias.'
          }
        },
        required: ['period']
      }
    },
    // ✅ NOVA FUNÇÃO: Resumo por Categoria
    {
      name: 'get_category_summary',
      description: 'Obter resumo de despesas por categoria quando o usuário perguntar "quanto gastei de X?", "resumo de alimentação", etc.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Nome da categoria (ex: "Alimentação", "Transporte", "Saúde")'
          },
          period: {
            type: 'string',
            description: 'Período: "hoje", "esta_semana", "este_mes", "mes_anterior"',
            enum: ['hoje', 'esta_semana', 'este_mes', 'mes_anterior']
          }
        },
        required: ['category', 'period']
      }
    }
  ];
}
```

---

### PASSO 2: Implementar Handlers no `handleFunctionCall()`

```javascript
async handleFunctionCall(functionName, functionArgs, context) {
  console.log(`🔧 [FUNCTION] ${functionName} com args:`, functionArgs);
  
  if (functionName === 'save_expense') {
    return await context.saveExpense(functionArgs);
  }
  
  // ✅ NOVO HANDLER: Salvar Entrada
  if (functionName === 'save_income') {
    return await this.saveIncome(functionArgs, context);
  }
  
  // ✅ NOVO HANDLER: Resumo de Despesas
  if (functionName === 'get_expenses_summary') {
    return await this.getExpensesSummary(functionArgs, context);
  }
  
  // ✅ NOVO HANDLER: Resumo por Categoria
  if (functionName === 'get_category_summary') {
    return await this.getCategorySummary(functionArgs, context);
  }
  
  return {
    success: false,
    message: 'Função não reconhecida'
  };
}
```

---

### PASSO 3: Implementar Métodos

#### 3.1. `saveIncome()` - Registrar Entrada

```javascript
async saveIncome(args, context) {
  try {
    const { amount, description, category, account_name, responsible, date } = args;
    
    // Normalizar owner (mapear "eu" para nome do usuário)
    let owner = responsible;
    if (this.normalizeText(owner) === 'eu') {
      owner = context.userName || owner;
    }
    
    // Buscar cost_center_id
    let costCenterId = null;
    if (owner && !this.normalizeText(owner).includes('compartilhado')) {
      const { data: centers } = await supabase
        .from('cost_centers')
        .select('id, name')
        .eq('organization_id', context.organizationId);
      
      if (centers && centers.length) {
        const ownerNorm = this.normalizeText(owner);
        const center = centers.find(c => {
          const n = this.normalizeText(c.name);
          return n === ownerNorm || n.includes(ownerNorm) || ownerNorm.includes(n);
        });
        
        if (center) {
          costCenterId = center.id;
          owner = center.name;
        }
      }
    }
    
    // Buscar bank_account_id se account_name foi informado
    let bankAccountId = null;
    if (account_name) {
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('id, name')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true);
      
      if (accounts && accounts.length) {
        const accountNorm = this.normalizeText(account_name);
        const account = accounts.find(a => {
          const n = this.normalizeText(a.name);
          return n === accountNorm || n.includes(accountNorm);
        });
        
        if (account) {
          bankAccountId = account.id;
        }
      }
    }
    
    // Preparar dados da entrada
    const incomeData = {
      amount: parseFloat(amount),
      description: description,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Outros',
      cost_center_id: costCenterId,
      organization_id: context.organizationId,
      user_id: context.userId,
      status: 'confirmed',
      is_shared: false,
      source: 'whatsapp'
    };
    
    // Salvar entrada
    const { data, error } = await supabase
      .from('incomes')
      .insert(incomeData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Se bank_account_id foi informado, criar transação bancária
    if (bankAccountId) {
      // Buscar saldo atual
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', bankAccountId)
        .single();
      
      const newBalance = (parseFloat(account.balance) || 0) + parseFloat(amount);
      
      // Atualizar saldo
      await supabase
        .from('bank_accounts')
        .update({ balance: newBalance })
        .eq('id', bankAccountId);
      
      // Criar transação
      await supabase
        .from('bank_account_transactions')
        .insert({
          bank_account_id: bankAccountId,
          transaction_type: 'income_deposit',
          amount: parseFloat(amount),
          description: description,
          date: incomeData.date,
          balance_after: newBalance,
          income_id: data.id,
          organization_id: context.organizationId,
          user_id: context.userId
        });
    }
    
    // Formatar resposta
    const amountFormatted = Number(amount).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    const dateDisplay = incomeData.date === new Date().toISOString().split('T')[0]
      ? 'Hoje'
      : new Date(incomeData.date + 'T00:00:00').toLocaleDateString('pt-BR');
    
    const accountDisplay = bankAccountId ? `\n${account_name}` : '';
    
    return {
      success: true,
      message: `Entrada registrada! ✅\nR$ ${amountFormatted} - ${description}\n${category || 'Sem categoria'}${accountDisplay}\n${owner}\n${dateDisplay}`
    };
    
  } catch (error) {
    console.error('❌ Erro ao salvar entrada:', error);
    return {
      success: false,
      message: 'Ops! Tive um problema ao registrar a entrada. 😅'
    };
  }
}
```

#### 3.2. `getExpensesSummary()` - Resumo de Despesas

```javascript
async getExpensesSummary(args, context) {
  try {
    const { period, category } = args;
    
    // Calcular datas baseado no período
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'hoje':
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case 'esta_semana':
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        endDate = new Date(today);
        break;
      case 'este_mes':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
    }
    
    // Construir query
    let query = supabase
      .from('expenses')
      .select('amount, category')
      .eq('organization_id', context.organizationId)
      .eq('status', 'confirmed')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data: expenses, error } = await query;
    
    if (error) throw error;
    
    // Calcular total
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalFormatted = total.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    // Agrupar por categoria se não foi filtrado
    let response = `💰 **Resumo de Despesas** (${this.formatPeriod(period)})\n\n`;
    
    if (category) {
      response += `Total em ${category}: R$ ${totalFormatted}\n`;
      response += `(${expenses.length} despesa${expenses.length !== 1 ? 's' : ''})`;
    } else {
      // Agrupar por categoria
      const byCategory = {};
      expenses.forEach(e => {
        const cat = e.category || 'Sem categoria';
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
      });
      
      response += `**Total: R$ ${totalFormatted}**\n\n`;
      
      // Ordenar por valor (maior primeiro)
      const sorted = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10
      
      sorted.forEach(([cat, value]) => {
        const percent = ((value / total) * 100).toFixed(1);
        response += `• ${cat}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percent}%)\n`;
      });
      
      response += `\n(${expenses.length} despesa${expenses.length !== 1 ? 's' : ''} no total)`;
    }
    
    return {
      success: true,
      message: response
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar resumo:', error);
    return {
      success: false,
      message: 'Ops! Tive um problema ao buscar o resumo. 😅'
    };
  }
}

// Helper para formatar período
formatPeriod(period) {
  const map = {
    'hoje': 'Hoje',
    'esta_semana': 'Esta Semana',
    'este_mes': 'Este Mês',
    'mes_anterior': 'Mês Anterior'
  };
  return map[period] || period;
}
```

#### 3.3. `getCategorySummary()` - Resumo por Categoria

```javascript
async getCategorySummary(args, context) {
  try {
    const { category, period } = args;
    
    // Reutilizar lógica de getExpensesSummary
    const summaryResult = await this.getExpensesSummary({ period, category }, context);
    
    if (!summaryResult.success) {
      return summaryResult;
    }
    
    // Adicionar detalhes adicionais se necessário
    const response = summaryResult.message.replace(
      `Total em ${category}:`,
      `Você gastou em ${category}:`
    );
    
    return {
      success: true,
      message: response
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar resumo por categoria:', error);
    return {
      success: false,
      message: 'Ops! Tive um problema ao buscar o resumo. 😅'
    };
  }
}
```

---

### PASSO 4: Atualizar Prompt do ZUL

Adicionar no `getConversationalInstructions()`:

```javascript
// Adicionar após a regra 13 (SOBRE VOCÊ):

14. **REGISTRAR ENTRADAS**: Quando o usuário mencionar valores recebidos (ex: "recebi comissão", "salário", "freelance"), chame a função save_income. Pergunte apenas o que faltar: valor, descrição, conta bancária (se quiser especificar), responsável.

15. **RESUMOS E CONSULTAS**: Quando o usuário perguntar sobre gastos (ex: "quanto gastei?", "resumo de despesas", "quanto já gastei de alimentação?"), chame as funções apropriadas:
   - "quanto gastei?" / "resumo de despesas" → get_expenses_summary (período: este_mes)
   - "quanto gastei de X?" / "quanto já gastei de alimentação?" → get_category_summary (category: X, period: este_mes)
   - Se o usuário mencionar período específico (hoje, semana, mês), use o período correto
```

**Exemplo de adição no prompt:**

```javascript
return `Você é o ZUL...

... [regras existentes] ...

CAPACIDADES ADICIONAIS:

- **Registrar Entradas/Receitas**: Se o usuário mencionar valores recebidos (ex: "recebi comissão de 200 reais", "salário", "freelance"), pergunte os dados necessários e chame save_income. Pergunte: valor, descrição, conta bancária (opcional), responsável.

- **Consultar Resumos**: Se o usuário perguntar sobre gastos:
  * "quanto gastei?" → get_expenses_summary (period: este_mes)
  * "quanto gastei de X?" → get_category_summary (category: X, period: este_mes)
  * "resumo de despesas" → get_expenses_summary (period: este_mes)
  
  Se mencionar período (hoje, semana, mês), use o período correto.

... [resto do prompt] ...
`;
```

---

## 📝 Exemplos de Uso

### Exemplo 1: Registrar Entrada
```
Usuário: Zul, recebi comissão de 200 reais
ZUL: Beleza! Qual conta adiciono? (ou perguntar se quiser especificar)
Usuário: Nubank
ZUL: [chama save_income]
Resposta: Entrada registrada! ✅
R$ 200,00 - comissão
Comissão
Nubank
Felipe
Hoje
```

### Exemplo 2: Resumo por Categoria
```
Usuário: Zul, quanto já gastei de alimentação esse mês?
ZUL: [chama get_category_summary(category: "Alimentação", period: "este_mes")]
Resposta: Você gastou em Alimentação: R$ 450,00
(15 despesas)
```

### Exemplo 3: Resumo Geral
```
Usuário: Zul, quanto gastei esse mês?
ZUL: [chama get_expenses_summary(period: "este_mes")]
Resposta: 💰 **Resumo de Despesas** (Este Mês)

**Total: R$ 1.250,00**

• Alimentação: R$ 450,00 (36,0%)
• Transporte: R$ 300,00 (24,0%)
• Casa: R$ 250,00 (20,0%)
• Saúde: R$ 150,00 (12,0%)
• Lazer: R$ 100,00 (8,0%)

(45 despesas no total)
```

---

## ✅ Checklist de Implementação

- [ ] Adicionar funções ao `getFunctions()`
- [ ] Implementar handlers no `handleFunctionCall()`
- [ ] Implementar `saveIncome()`
- [ ] Implementar `getExpensesSummary()`
- [ ] Implementar `getCategorySummary()`
- [ ] Adicionar helper `formatPeriod()`
- [ ] Atualizar prompt do ZUL
- [ ] Testar registro de entrada
- [ ] Testar resumos por período
- [ ] Testar resumos por categoria
- [ ] Verificar integração com contas bancárias

---

## 🔍 Queries SQL Necessárias

As queries já estão sendo feitas via Supabase client, mas aqui estão as SQL equivalentes para referência:

### Resumo de Despesas
```sql
SELECT 
  category,
  SUM(amount) as total,
  COUNT(*) as count
FROM expenses
WHERE organization_id = $1
  AND status = 'confirmed'
  AND date >= $2
  AND date <= $3
GROUP BY category
ORDER BY total DESC;
```

### Resumo por Categoria Específica
```sql
SELECT 
  SUM(amount) as total,
  COUNT(*) as count
FROM expenses
WHERE organization_id = $1
  AND category = $2
  AND status = 'confirmed'
  AND date >= $3
  AND date <= $4;
```

---

## 🚨 Considerações Importantes

1. **Performance**: Para resumos, considere adicionar índices nas colunas `date`, `category`, `organization_id` se ainda não existirem.

2. **RLS (Row Level Security)**: Garanta que as queries respeitam as políticas RLS do Supabase.

3. **Validação**: Sempre valide `organization_id` e `user_id` nas queries.

4. **Formatação**: Use formatação brasileira (pt-BR) para valores e datas.

5. **Erros**: Trate erros graciosamente e retorne mensagens amigáveis.

---

## 📚 Próximos Passos

Após implementar essas funcionalidades básicas, você pode expandir para:
- Resumos por período customizado
- Comparações entre períodos
- Gráficos simples (via texto/emoji)
- Alertas de limite de orçamento
- Análises mais complexas

---

**Arquivo criado em:** `docs/ZUL_NOVAS_FUNCIONALIDADES.md`
**Última atualização:** 31/10/2025

