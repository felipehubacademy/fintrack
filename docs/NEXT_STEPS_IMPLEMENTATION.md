# 🚀 Próximos Passos - Implementação Pendente

## ✅ Já Implementado (Nesta Sessão):

1. **Smart Categorization** (`web/lib/smartCategorization.js`)
   - Sistema de keywords para sugestão automática
   - Aprendizado com confirmações do usuário
   - 90%+ de acurácia esperada

2. **SQL para Metas Financeiras** (`docs/migrations/create-financial-goals-table.sql`)
   - Tabela `financial_goals`
   - Tabela `goal_contributions`
   - Triggers automáticos
   - Função de projeção

---

## 🔨 Para Implementar Agora:

### 1. Página de Metas Financeiras (`web/pages/dashboard/goals.jsx`)

**Estrutura:**
```
┌─────────────────────────────────────────────┐
│ Header: "Metas Financeiras"                │
│ [+ Nova Meta]                               │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 🎯 Reserva de Emergência            │   │
│ │ R$ 15.000 / R$ 30.000 (50%)         │   │
│ │ [████████████░░░░░░░░░░░░]          │   │
│ │ Faltam 15 meses · R$ 1.000/mês      │   │
│ │ [Ver Detalhes] [Contribuir]         │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ┌─────────────────────────────────────┐   │
│ │ 💳 Quitar Cartão                    │   │
│ │ R$ 3.000 / R$ 5.000 (60%)           │   │
│ │ [████████████████░░░░░░░░]          │   │
│ │ Faltam 5 meses · R$ 400/mês         │   │
│ │ [Ver Detalhes] [Contribuir]         │   │
│ └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Features:**
- Cards de metas com progress circular
- Modal de criação/edição
- Modal de contribuição
- Timeline de evolução
- Gráfico de projeção
- Badges/conquistas

**Componentes a criar:**
- `web/components/Goals/GoalCard.jsx`
- `web/components/Goals/GoalModal.jsx`
- `web/components/Goals/ContributionModal.jsx`
- `web/components/Goals/GoalTimeline.jsx`

---

### 2. Tooltips na Página de Insights

**Seções que precisam de tooltips:**

#### Seção 1: KPIs
- **Gasto no Mês:** "Total de despesas confirmadas neste mês. Comparado com o mês anterior para mostrar tendência."
- **Orçamento:** "Percentual do orçamento total já utilizado. Calculado dividindo gastos pelo total planejado."
- **Dias Restantes:** "Dias até o fim do mês. Média diária ajuda a projetar se vai estourar o orçamento."
- **Projeção:** "Estimativa de gasto total até o fim do mês, baseado no ritmo atual."

#### Seção 2: Tendências
"Gráfico mostrando evolução dos gastos por macro categoria nos últimos 6 meses. Ajuda a identificar padrões sazonais."

#### Seção 3: Insights
"Análise automática de padrões financeiros. O sistema detecta aumentos, reduções e comportamentos importantes."

#### Seção 4: Comparativo
"Compara gastos do mês atual com a média dos últimos 3 meses. Verde = economizou, Vermelho = gastou mais."

#### Seção 5: Score
"Pontuação de 0-100 que avalia sua saúde financeira. Baseado em 5 fatores: cumprimento de orçamento, investimentos, reserva, diversidade de renda e redução de dívidas."

#### Seção 6: Ondas de Gastos
"Visualização dia-a-dia dos gastos do mês. Identifica picos (ex: final de semana) e ajuda a controlar ritmo."

**Componente a usar:**
- Já existe: `web/components/ui/Tooltip.jsx` (verificar se existe)
- Se não, criar baseado em Radix UI ou Headless UI

---

### 3. Adicionar Insights ao Tour

**Arquivo:** `web/components/OnboardingTour.jsx` (ou similar)

**Adicionar step:**
```javascript
{
  target: '[data-tour="insights"]',
  content: 'Acompanhe tendências, padrões e receba insights automáticos sobre sua saúde financeira!',
  placement: 'bottom',
  disableBeacon: true
}
```

**Verificar:**
- Qual biblioteca de tour está sendo usada? (react-joyride, intro.js, shepherd.js?)
- Onde está o arquivo do tour?
- Adicionar `data-tour="insights"` no link do menu

---

### 4. Integração Open Banking (Estrutura)

**Arquivo:** `web/lib/openBanking.js`

**Estrutura preparatória:**
```javascript
// Configuração para Pluggy API
const PLUGGY_CLIENT_ID = process.env.NEXT_PUBLIC_PLUGGY_CLIENT_ID;
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET;

export async function connectBank(userId) {
  // Widget do Pluggy para conectar banco
  // Retorna: accessToken, itemId
}

export async function syncTransactions(itemId) {
  // Busca transações do banco
  // Mapeia para formato da app
  // Insere em expenses
}

export async function getAccounts(itemId) {
  // Lista contas bancárias
  // Retorna: saldos, tipos
}
```

**Componente:**
- `web/components/OpenBanking/ConnectBankButton.jsx`
- `web/components/OpenBanking/BankConnectionStatus.jsx`

**Tabela SQL:**
```sql
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  item_id TEXT, -- Pluggy itemId
  bank_name TEXT,
  status TEXT, -- 'active', 'error', 'disconnected'
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📋 Checklist de Implementação:

### Prioridade Alta (Fazer Agora):
- [ ] Rodar migration de metas (`create-financial-goals-table.sql`)
- [ ] Criar página de metas (`web/pages/dashboard/goals.jsx`)
- [ ] Criar componentes de metas (4 componentes)
- [ ] Adicionar tooltips em Insights (6 seções)
- [ ] Adicionar Insights ao tour
- [ ] Adicionar link "Metas" no menu

### Prioridade Média (Próxima Sessão):
- [ ] Implementar Open Banking (estrutura + Pluggy)
- [ ] Criar página de configuração de Open Banking
- [ ] Implementar sync automático de transações
- [ ] Badges/gamificação em metas

### Prioridade Baixa (Futuro):
- [ ] Sistema de alertas (push/email/WhatsApp)
- [ ] Relatórios mensais em PDF
- [ ] ML avançado para categorização
- [ ] Integração com mais bancos

---

## 🎯 Estimativa de Tempo:

- **Metas Financeiras:** 2-3 horas
- **Tooltips + Tour:** 30 minutos
- **Open Banking (estrutura):** 1 hora
- **Total:** ~4 horas

---

## 📚 Referências:

### APIs:
- Pluggy: https://docs.pluggy.ai
- Belvo: https://docs.belvo.com

### UI/UX:
- YNAB Goals: https://www.ynab.com
- Mint Insights: https://mint.intuit.com
- Organizze: https://www.organizze.com.br

### Componentes:
- Radix UI Tooltip: https://www.radix-ui.com/docs/primitives/components/tooltip
- React Joyride: https://docs.react-joyride.com

