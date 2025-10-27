# Ordem de Execução das Migrations SQL

## ✅ Sequência para Aplicar no Supabase

### 1. Primeiro: Adicionar Estrutura de Privacidade
**Arquivo:** `/docs/migrations/add-privacy-architecture.sql`

**O que faz:**
- Adiciona coluna `is_shared` BOOLEAN em:
  - `cards`
  - `budgets`
  - `expenses` (renomeia `split` → `is_shared` se existir)
  - `incomes`
  - `investment_goals` (se existir)
- Cria índices para performance:
  - `idx_expenses_is_shared` (is_shared, organization_id)
  - `idx_incomes_is_shared` (is_shared, organization_id)
  - `idx_cards_is_shared` (is_shared, organization_id)
  - `idx_budgets_is_shared` (is_shared, organization_id)
- Migra dados existentes:
  - Despesas com `expense_splits` → `is_shared = true`
  - Receitas com `income_splits` → `is_shared = true`
  - Bills com `bill_splits` → `is_shared = true`

**Por que primeiro:**
- Prepara estrutura necessária para o sistema de privacidade
- Adiciona campos que o frontend já usa
- Cria índices para manter performance

---

### 2. Segundo: RLS Policies (OPCIONAL - de momento DISABLED)
**Arquivo:** `/docs/migrations/update-rls-privacy-policies.sql`

**Status:** ⚠️ DESABILITADO POR HORA

**O que faria (se aplicado no futuro):**
- Remove policies antigas
- Cria novas policies com lógica de privacidade:
  - Individual: só o dono vê/edita/deleta
  - Compartilhado: todos da org veem/edita/deleta
- Aplica para: expenses, incomes, cards, budgets

**Por que disabled agora:**
- RLS será implementada massivamente no final
- Permite testes sem restrições de segurança
- Frontend já filtra dados corretamente

---

### 3. Terceiro: Triggers de Rebalanceamento
**Arquivo:** `/docs/migrations/add-rebalance-triggers.sql`

**O que faz:**
- Cria função `rebalance_split_percentages_on_new_member()`
- Cria trigger que detecta quando 2º membro aceita convite
- Rebalanceia cost centers de 100% para 50/50 automaticamente

**Por que importante:**
- Quando admin cria org → cost center dele fica com 100%
- Quando 2º membro aceita → ambos devem ter 50%
- Trigger automatiza esse rebalanceamento

### 4. Quarto: Corrigir Cost Centers Existentes
**Arquivo:** `/docs/migrations/fix-existing-cost-centers.sql`

**O que faz:**
- Identifica organizações com 2 membros
- Encontra cost centers ainda com 100% cada
- Rebalanceia para 50/50 manualmente

**Por que necessário:**
- Corrige dados já existentes no banco
- Aplica a regra de negócio retroativamente

---

## 📋 Resumo

**Executar AGORA (ordem):**
1. ✅ `/docs/migrations/add-privacy-architecture.sql`
2. ✅ `/docs/migrations/add-cost-center-fields-to-invites.sql` **← NOVO**
3. ✅ `/docs/migrations/add-rebalance-triggers.sql`
4. ✅ `/docs/migrations/fix-existing-cost-centers.sql`

**Deixar para DEPOIS:**
5. ⏸️ `/docs/migrations/update-rls-privacy-policies.sql` (desabilitado)

---

## 🎯 Resultado após executar:

- ✅ Campos `is_shared` adicionados em todas as tabelas
- ✅ Índices criados para performance
- ✅ Dados existentes migrados (marcados como compartilhados se têm splits)
- ⚠️ RLS desabilitada (sistema filtrado apenas no frontend)

