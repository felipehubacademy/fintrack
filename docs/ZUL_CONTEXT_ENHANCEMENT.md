# 📊 Plano: Enriquecer Contexto do Zul com Dados Financeiros

## Objetivo
Dar acesso ao Zul a informações financeiras reais da organização para que ele possa fornecer insights personalizados e úteis ao usuário.

## Dados Disponíveis para Enviar

### 1. Resumo Financeiro do Mês Atual
- **Total de Entradas**: Soma de todas as entradas confirmadas
- **Total de Despesas**: Soma de todas as despesas confirmadas
- **Saldo do Mês**: Entradas - Despesas
- **Despesas por Forma de Pagamento**: 
  - Crédito (total e %)
  - À Vista (total e %)
- **Despesas por Categoria**: Top 5 categorias com maiores gastos
- **Cartões de Crédito**: 
  - Limite total
  - Uso atual
  - Disponível
  - Por cartão (nome, limite, usado, disponível)

### 2. Comparativo Mensal (últimos 3-6 meses)
- Evolução de entradas
- Evolução de despesas
- Tendências (aumentando/diminuindo)

### 3. Informações da Organização
- Nome da organização
- Membros (quantidade)
- Cost centers ativos

### 4. Contexto Temporal
- Mês atual sendo visualizado
- Data atual

## Estrutura de Implementação

### Fase 1: Frontend - Coletar Dados

**Arquivo**: `web/components/ZulFloatingButton.jsx`

Adicionar função para coletar dados financeiros:

```javascript
const getFinancialContext = async () => {
  if (!organization || !orgUser) return null;
  
  try {
    // Buscar dados do mês atual
    const currentMonth = new Date().toISOString().slice(0, 7);
    const startOfMonth = `${currentMonth}-01`;
    const [year, month] = currentMonth.split('-');
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

    // Buscar despesas do mês
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, payment_method, category, date')
      .eq('organization_id', organization.id)
      .eq('status', 'confirmed')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    // Buscar entradas do mês
    const { data: incomes } = await supabase
      .from('incomes')
      .select('amount, date')
      .eq('organization_id', organization.id)
      .eq('status', 'confirmed')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    // Buscar cartões
    const { data: cards } = await supabase
      .from('cards')
      .select('name, credit_limit, type')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .eq('type', 'credit');

    // Calcular resumos
    const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
    const totalIncomes = incomes?.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0) || 0;
    const balance = totalIncomes - totalExpenses;

    // Despesas por forma de pagamento
    const creditExpenses = expenses?.filter(e => e.payment_method === 'credit_card')
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
    const cashExpenses = totalExpenses - creditExpenses;

    // Top 5 categorias
    const categoryTotals = {};
    expenses?.forEach(e => {
      const catName = e.category?.name || 'Outros';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(e.amount || 0);
    });
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // Uso de cartões
    const cardsUsage = {};
    // TODO: Calcular uso real de cada cartão
    
    return {
      month: currentMonth,
      summary: {
        totalIncomes,
        totalExpenses,
        balance,
        creditExpenses,
        cashExpenses,
        creditPercentage: totalExpenses > 0 ? (creditExpenses / totalExpenses * 100).toFixed(1) : 0,
        cashPercentage: totalExpenses > 0 ? (cashExpenses / totalExpenses * 100).toFixed(1) : 0
      },
      topCategories,
      cards: cards?.map(c => ({
        name: c.name,
        limit: c.credit_limit,
        used: cardsUsage[c.id]?.used || 0,
        available: (c.credit_limit || 0) - (cardsUsage[c.id]?.used || 0)
      })) || [],
      organization: {
        name: organization.name,
        memberCount: costCenters?.filter(cc => cc.is_active).length || 0
      }
    };
  } catch (error) {
    console.error('Error fetching financial context:', error);
    return null;
  }
};
```

### Fase 2: Enviar Contexto na API

**Modificar**: `web/components/ZulFloatingButton.jsx` - função `handleSendMessage`

```javascript
const handleSendMessage = async () => {
  // ... código existente ...
  
  try {
    // Coletar contexto financeiro
    const financialContext = await getFinancialContext();
    
    const response = await fetch('/api/zul-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: inputMessage.trim(),
        userId: user?.id || 'web-user',
        userName: user?.name || 'Usuário Web',
        organizationId: organization?.id,
        context: financialContext // <-- NOVO
      })
    });
    // ... resto do código
  }
};
```

### Fase 3: Backend - Processar Contexto

**Modificar**: `web/pages/api/zul-chat.js`

```javascript
body: JSON.stringify({
  message,
  userId: userId || 'web-user',
  userName: userName || 'Usuário Web',
  userPhone: userPhone || null,
  context: req.body.context || {} // <-- Passar contexto adiante
})
```

**Modificar**: `backend/api/zul-chat.js`

```javascript
const { message, userId, userName, userPhone, context } = req.body;

const response = await zul.processMessage(
  message,
  userIdFinal,
  userNameFinal,
  userPhoneFinal,
  context // <-- Já está sendo passado, mas precisa ser usado
);
```

### Fase 4: ZulWebChat - Usar Contexto

**Modificar**: `backend/services/zulWebChat.js`

Atualizar `getWebChatInstructions` para incluir dados financeiros:

```javascript
getWebChatInstructions(context) {
  const { userName, summary, topCategories, cards, organization, month } = context;
  
  let instructions = `Você é Zul, assistente financeiro do MeuAzulão...`;
  
  // Adicionar dados financeiros se disponíveis
  if (summary) {
    instructions += `\n\nDADOS FINANCEIROS DO USUÁRIO (${month}):\n`;
    instructions += `- Total de Entradas: R$ ${summary.totalIncomes.toFixed(2)}\n`;
    instructions += `- Total de Despesas: R$ ${summary.totalExpenses.toFixed(2)}\n`;
    instructions += `- Saldo do Mês: R$ ${summary.balance.toFixed(2)}\n`;
    instructions += `- Despesas no Crédito: R$ ${summary.creditExpenses.toFixed(2)} (${summary.creditPercentage}%)\n`;
    instructions += `- Despesas à Vista: R$ ${summary.cashExpenses.toFixed(2)} (${summary.cashPercentage}%)\n`;
    
    if (topCategories?.length > 0) {
      instructions += `\nTop 5 Categorias de Gastos:\n`;
      topCategories.forEach((cat, i) => {
        instructions += `${i + 1}. ${cat.name}: R$ ${cat.amount.toFixed(2)}\n`;
      });
    }
    
    if (cards?.length > 0) {
      instructions += `\nCartões de Crédito:\n`;
      cards.forEach(card => {
        const usagePercent = card.limit > 0 ? (card.used / card.limit * 100).toFixed(1) : 0;
        instructions += `- ${card.name}: R$ ${card.used.toFixed(2)} / R$ ${card.limit.toFixed(2)} (${usagePercent}% usado, R$ ${card.available.toFixed(2)} disponível)\n`;
      });
    }
  }
  
  instructions += `\nIMPORTANTE: Use esses dados para dar insights personalizados e específicos.`;
  instructions += `Seja proativo: aponte tendências, alerte sobre gastos excessivos, sugira economia.`;
  instructions += `Seja específico com números e categorias.`;
  
  return instructions;
}
```

## Exemplos de Insights que o Zul Poderá Dar

### 1. Análise de Gastos
- "Vi que você gastou R$ 1.200 em Restaurantes este mês, isso representa 15% do total. Está dentro do seu orçamento?"
- "Suas despesas no crédito aumentaram 20% em relação ao mês anterior. Quer que eu ajude a controlar isso?"

### 2. Alertas de Cartão
- "Atenção! Seu cartão Latam está com 85% de uso (R$ 8.500 de R$ 10.000). Cuidado para não estourar!"
- "Você tem R$ 3.200 disponível no cartão Nubank. Que tal usar para uma emergência se precisar?"

### 3. Sugestões de Economia
- "Noto que Supermercado é sua maior categoria (R$ 800). Você já pensou em fazer lista de compras para evitar compras por impulso?"
- "Seu saldo positivo está em R$ 2.500. Que tal separar 20% (R$ 500) para uma reserva de emergência?"

### 4. Comparativos
- "Este mês você gastou 10% mais que no mês anterior. Os principais aumentos foram em Restaurantes e Transporte."
- "Suas entradas aumentaram! Parabéns! De R$ 5.000 para R$ 6.200 (+24%)."

## Segurança e Privacidade

### Considerações
1. **Dados Sensíveis**: Apenas dados agregados são enviados, nunca transações individuais
2. **Contexto Opcional**: Se houver erro ao buscar dados, o chat continua funcionando sem contexto
3. **Cache**: Não cachear dados financeiros (sempre buscar fresh)
4. **Validação**: Validar que o usuário pertence à organização antes de buscar dados

### Implementação Segura
```javascript
// Validar acesso antes de buscar
if (!organization || !user || user.organization_id !== organization.id) {
  return null; // Não retornar dados
}
```

## Ordem de Implementação

1. ✅ **Fase 1**: Criar função `getFinancialContext` no frontend
2. ✅ **Fase 2**: Modificar `handleSendMessage` para incluir contexto
3. ✅ **Fase 3**: Atualizar API para passar contexto
4. ✅ **Fase 4**: Atualizar `zulWebChat` para usar contexto nas instruções
5. ✅ **Fase 5**: Testar e ajustar formato dos insights

## Próximos Passos

1. Implementar coleta de dados no frontend
2. Testar com diferentes cenários (sem dados, com dados, com muitos dados)
3. Ajustar instruções do Zul para ser mais proativo
4. Adicionar mais métricas conforme necessário (ex: comparação com mês anterior)

