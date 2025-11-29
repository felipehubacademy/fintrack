# 📱 Plano de Implementação Mobile - FinTrack

## 🎯 Objetivo
Implementar todas as funcionalidades do web no mobile, mantendo UI/UX consistente mas adaptado para experiência nativa.

## 📊 Status Atual
✅ Monorepo configurado
✅ Autenticação funcionando
✅ Navegação básica (Login → Dashboard)
✅ Pacote shared compartilhando lógica

---

## 🗺️ ROTEIRO DE IMPLEMENTAÇÃO

### **FASE 1: FUNDAÇÃO & NAVEGAÇÃO** (Prioridade: CRÍTICA)

#### 1.1 Estrutura de Navegação Completa
**Telas do Web a replicar:**
- Dashboard (index)
- Transações
- Cartões
- Contas Bancárias
- Contas a Pagar
- Orçamentos
- Investimentos
- Metas
- Fechamento
- Insights
- Configurações

**Implementação:**
```
src/navigation/
├── AppNavigator.js (já existe)
├── MainTabNavigator.js (NOVO - bottom tabs)
├── DashboardStack.js (NOVO - stack do dashboard)
└── ProfileStack.js (NOVO - stack de perfil/config)
```

**Bottom Tab Navigation:**
- 🏠 Dashboard
- 💰 Transações
- 💳 Finanças (Cartões, Contas, Investimentos)
- ⚙️ Mais (Config, Metas, Insights)

---

### **FASE 2: DASHBOARD HOME** (Prioridade: ALTA)

#### 2.1 Componentes do Dashboard
**Do Web:**
- Stats Cards (total despesas, receitas, saldo)
- Gráficos do mês (pizza de categorias)
- Comparação mensal
- Cartões em destaque
- Ações rápidas

**Mobile:**
```
src/components/dashboard/
├── StatsCards.js (cards de resumo)
├── MonthlyChart.js (gráfico do mês)
├── QuickActions.js (ações rápidas)
├── CardsOverview.js (visão de cartões)
└── MonthSelector.js (seletor de mês)
```

**Layout Mobile:**
```
[Header com usuário e notificações]
[Seletor de Mês]
[Stats Cards - ScrollView horizontal]
[Gráfico Principal]
[Ações Rápidas - Grid 2x2]
[Cartões em Destaque]
[Comparação com mês anterior]
```

---

### **FASE 3: TRANSAÇÕES** (Prioridade: ALTA)

#### 3.1 Lista de Transações
**Do Web:** `/dashboard/transactions`

**Mobile:**
```
src/screens/
├── TransactionsScreen.js (lista)
├── TransactionDetailScreen.js (detalhes)
└── AddTransactionScreen.js (adicionar/editar)

src/components/transactions/
├── TransactionCard.js (card de transação)
├── TransactionFilters.js (filtros)
├── CategorySelector.js (seletor de categoria)
└── DatePicker.js (seletor de data)
```

**Features:**
- ✅ Lista com scroll infinito
- ✅ Filtros (categoria, data, tipo)
- ✅ Busca
- ✅ Swipe para deletar
- ✅ Pull to refresh
- ✅ Adicionar despesa/receita
- ✅ Editar transação
- ✅ Upload de comprovante

---

### **FASE 4: CARTÕES** (Prioridade: ALTA)

#### 4.1 Gestão de Cartões
**Do Web:** `/dashboard/cards`

**Mobile:**
```
src/screens/cards/
├── CardsListScreen.js
├── CardDetailScreen.js
├── InvoiceDetailScreen.js
└── AddCardScreen.js

src/components/cards/
├── CardItem.js (visual do cartão)
├── InvoiceCard.js (fatura)
└── CardUsageChart.js (uso do limite)
```

**Features:**
- ✅ Lista de cartões
- ✅ Detalhes do cartão (limite, fatura)
- ✅ Transações do cartão
- ✅ Marcar fatura como paga
- ✅ Adicionar novo cartão

---

### **FASE 5: CONTAS BANCÁRIAS** (Prioridade: MÉDIA)

#### 5.1 Gestão de Contas
**Do Web:** `/dashboard/bank-accounts`

**Mobile:**
```
src/screens/banking/
├── BankAccountsScreen.js
├── AccountDetailScreen.js
├── AccountTransactionsScreen.js
└── AddAccountScreen.js

src/components/banking/
├── BankAccountCard.js
├── AccountBalance.js
└── BelvoIntegration.js (Open Finance)
```

**Features:**
- ✅ Lista de contas
- ✅ Saldo por conta
- ✅ Transações da conta
- ✅ Integração Belvo (Open Finance)
- ✅ Adicionar conta manual

---

### **FASE 6: CONTAS A PAGAR** (Prioridade: MÉDIA)

#### 6.1 Gestão de Contas
**Do Web:** `/dashboard/bills`

**Mobile:**
```
src/screens/bills/
├── BillsScreen.js
├── BillDetailScreen.js
└── AddBillScreen.js

src/components/bills/
├── BillCard.js
├── BillCalendar.js
└── BillNotification.js
```

**Features:**
- ✅ Lista de contas a pagar
- ✅ Filtro por status (pendente, pago, vencido)
- ✅ Marcar como pago
- ✅ Notificações de vencimento
- ✅ Adicionar conta recorrente

---

### **FASE 7: ORÇAMENTOS** (Prioridade: MÉDIA)

#### 7.1 Gestão de Orçamentos
**Do Web:** `/dashboard/budgets`

**Mobile:**
```
src/screens/budgets/
├── BudgetsScreen.js
├── BudgetDetailScreen.js
└── BudgetWizardScreen.js

src/components/budgets/
├── BudgetCard.js
├── BudgetProgress.js
└── CategoryBudget.js
```

**Features:**
- ✅ Lista de orçamentos
- ✅ Progresso por categoria
- ✅ Wizard de criação
- ✅ Alertas de limite
- ✅ Comparação real vs planejado

---

### **FASE 8: INVESTIMENTOS** (Prioridade: BAIXA)

#### 8.1 Gestão de Investimentos
**Do Web:** `/dashboard/investments`

**Mobile:**
```
src/screens/investments/
├── InvestmentsScreen.js
├── InvestmentDetailScreen.js
└── AddInvestmentScreen.js

src/components/investments/
├── InvestmentCard.js
├── PortfolioChart.js
└── InvestmentProgress.js
```

---

### **FASE 9: METAS** (Prioridade: BAIXA)

#### 9.1 Gestão de Metas
**Do Web:** `/dashboard/goals`

**Mobile:**
```
src/screens/goals/
├── GoalsScreen.js
├── GoalDetailScreen.js
└── AddGoalScreen.js

src/components/goals/
├── GoalCard.js
├── GoalTimeline.js
├── ContributionModal.js
└── GoalBadges.js
```

---

### **FASE 10: INSIGHTS** (Prioridade: BAIXA)

#### 10.1 Insights Financeiros
**Do Web:** `/dashboard/insights`

**Mobile:**
```
src/screens/
└── InsightsScreen.js

src/components/insights/
├── InsightCard.js
├── TrendChart.js
└── FinancialScore.js
```

---

### **FASE 11: CONFIGURAÇÕES** (Prioridade: MÉDIA)

#### 11.1 Perfil e Configurações
**Do Web:** `/dashboard/config`

**Mobile:**
```
src/screens/settings/
├── SettingsScreen.js
├── ProfileScreen.js
├── NotificationsScreen.js
├── CategoryManagementScreen.js
├── MembersScreen.js
└── AboutScreen.js

src/components/settings/
├── SettingItem.js
├── ProfileAvatar.js
└── MemberCard.js
```

---

### **FASE 12: RECURSOS NATIVOS** (Prioridade: MÉDIA)

#### 12.1 Features Mobile-Only
```
src/services/
├── camera.js (captura de comprovantes)
├── notifications.js (push notifications)
├── biometrics.js (Face ID / Touch ID)
└── shareSheet.js (compartilhar)

src/components/native/
├── CameraCapture.js
├── BiometricAuth.js
└── ShareButton.js
```

**Features:**
- ✅ Captura de foto de comprovante
- ✅ Push notifications
- ✅ Biometria para login
- ✅ Compartilhar exportações
- ✅ Modo offline (cache local)

---

### **FASE 13: ZUL ASSISTANT** (Prioridade: BAIXA)

#### 13.1 Assistente Zul no Mobile
**Do Web:** Floating button + chat

**Mobile:**
```
src/screens/
└── ZulChatScreen.js

src/components/zul/
├── ZulFloatingButton.js
├── ChatMessage.js
└── QuickActions.js
```

---

## 🎨 DESIGN SYSTEM MOBILE

### Cores (mesmo do web)
```javascript
colors: {
  primary: '#2563eb',      // Azul principal
  secondary: '#f59e0b',    // Amarelo/laranja
  success: '#10b981',      // Verde
  danger: '#ef4444',       // Vermelho
  warning: '#f59e0b',      // Laranja
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    // ... resto da escala
  }
}
```

### Componentes Base
```
src/components/ui/
├── Button.js
├── Card.js
├── Input.js
├── Select.js
├── Badge.js
├── Avatar.js
├── LoadingSpinner.js
├── EmptyState.js
└── ErrorBoundary.js
```

### Tipografia
```javascript
fonts: {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  }
}
```

---

## 📦 ORDEM DE IMPLEMENTAÇÃO

### Sprint 1 (Fundação - 2-3 dias)
1. ✅ Bottom Tab Navigation
2. ✅ Design System (componentes UI base)
3. ✅ Dashboard Home (layout básico)

### Sprint 2 (Core - 3-4 dias)
4. ✅ Transações (lista + adicionar)
5. ✅ Stats Cards funcionais
6. ✅ Gráficos do dashboard

### Sprint 3 (Finanças - 3-4 dias)
7. ✅ Cartões (lista + detalhes)
8. ✅ Contas Bancárias
9. ✅ Faturas de cartão

### Sprint 4 (Planejamento - 2-3 dias)
10. ✅ Contas a Pagar
11. ✅ Orçamentos

### Sprint 5 (Avançado - 2-3 dias)
12. ✅ Investimentos
13. ✅ Metas
14. ✅ Insights

### Sprint 6 (Config & Native - 2-3 dias)
15. ✅ Configurações
16. ✅ Câmera para comprovantes
17. ✅ Push Notifications
18. ✅ Biometria

### Sprint 7 (Polish - 1-2 dias)
19. ✅ Refinamentos de UI
20. ✅ Animações
21. ✅ Testes finais

---

## 📝 PADRÕES DE CÓDIGO

### Estrutura de Screen
```javascript
import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '@fintrack/shared/api';
import { formatCurrency } from '@fintrack/shared/utils';

export default function MyScreen({ navigation, route }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Lógica compartilhada do shared
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Conteúdo */}
    </ScrollView>
  );
}
```

---

## ✅ CHECKLIST POR TELA

Cada tela deve ter:
- [ ] Layout responsivo
- [ ] Pull to refresh
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling
- [ ] Navegação correta
- [ ] Compartilha lógica com web via @fintrack/shared
- [ ] Estilos consistentes com design system
- [ ] Acessibilidade (labels, hints)

---

## 🚀 TEMPO ESTIMADO

**Total:** ~20-25 dias de desenvolvimento

- Fundação: 2-3 dias
- Core Features: 6-8 dias
- Features Avançadas: 6-8 dias
- Native Features: 2-3 dias
- Polish & Testes: 2-3 dias
- Ajustes finais: 2 dias

---

## 📊 MÉTRICAS DE SUCESSO

✅ 100% das telas web replicadas
✅ Mesma lógica de negócio (shared)
✅ UI consistente entre plataformas
✅ Performance nativa (60fps)
✅ Funciona offline (básico)
✅ Push notifications ativas
✅ Biometria funcionando
✅ Taxa de crash < 1%

