# 🚀 Migração para Novo Projeto Supabase

## 📋 Tabelas Necessárias para o Projeto Funcionar 100%

### Tabelas Core (Organização e Usuários)
1. **organizations**
   - Colunas: id, name, admin_id, email, invite_code, type ('solo' | 'family')
   - Ordem: Executar primeiro (é base de tudo)

2. **users**
   - Colunas: id, email, phone, name, organization_id, role, is_active, phone_verified
   - FK: organization_id → organizations

3. **cost_centers** (Responsáveis)
   - Colunas: id, name, organization_id, default_split_percentage, color, user_id, linked_email
   - FK: organization_id → organizations, user_id → users

### Tabelas Financeiras

4. **budget_categories** (Categorias)
   - Colunas: id, name, organization_id, color, is_default
   - FK: organization_id → organizations

5. **expenses** (Despesas)
   - Colunas: id, amount, description, date, category_id, cost_center_id, payment_method, card_id, status, is_shared, organization_id, user_id
   - FK: organization_id → organizations, user_id → users, category_id → budget_categories, cost_center_id → cost_centers, card_id → cards

6. **expense_splits** (Divisão de Despesas)
   - Colunas: id, expense_id, cost_center_id, percentage, amount
   - FK: expense_id → expenses, cost_center_id → cost_centers

7. **incomes** (Entradas)
   - Colunas: id, description, amount, date, category, cost_center_id, is_shared, source, status, organization_id, user_id
   - FK: organization_id → organizations, user_id → users, cost_center_id → cost_centers

8. **income_splits** (Divisão de Entradas)
   - Colunas: id, income_id, cost_center_id, percentage, amount
   - FK: income_id → incomes, cost_center_id → cost_centers

9. **bills** (Contas a Pagar)
   - Colunas: id, description, amount, due_date, category_id, cost_center_id, is_recurring, recurrence_frequency, status, paid_at, payment_method, card_id, expense_id, organization_id, user_id
   - FK: organization_id → organizations, user_id → users, category_id → budget_categories, cost_center_id → cost_centers, card_id → cards, expense_id → expenses

### Tabelas de Gestão

10. **cards** (Cartões de Crédito)
    - Colunas: id, name, bank, last_digits, limit, closing_day, is_shared, is_active, organization_id, user_id
    - FK: organization_id → organizations, user_id → users

11. **budgets** (Orçamentos)
    - Colunas: id, name, category_id, amount, period, is_shared, organization_id, user_id
    - FK: organization_id → organizations, user_id → users, category_id → budget_categories

### Tabelas de Sistema

12. **onboarding_progress** (Progresso de Onboarding)
    - Colunas: id, user_id, organization_id, current_step, completed_steps, is_completed, started_at, completed_at, skipped, step_data
    - FK: user_id → users, organization_id → organizations

13. **pending_invites** (Convites Pendentes)
    - Colunas: id, organization_id, email, name, role, invite_code, invited_by, expires_at, accepted_at
    - FK: organization_id → organizations, invited_by → users

14. **notifications** (Notificações) - Opcional
    - Colunas: id, user_id, organization_id, type, title, message, is_read, created_at
    - FK: user_id → users, organization_id → organizations

### Tabelas Secundárias (Opcionais)

15. **investment_goals** (Metas de Investimento)
    - Colunas: id, name, target_amount, current_amount, deadline, is_shared, organization_id, user_id
    - FK: organization_id → organizations, user_id → users

16. **bank_accounts** (Contas Bancárias) - Se usado
    - Colunas: id, name, bank, account_type, account_number, initial_balance, current_balance, is_active, owner_type, cost_center_id, organization_id, user_id
    - FK: organization_id → organizations, user_id → users, cost_center_id → cost_centers

---

## 🎯 SQL Completo de Migração

### Passo 1: Criar Novo Projeto no Supabase
1. Acesse supabase.com
2. Clique em "New Project"
3. Dê um nome (ex: "meuazulao")
4. Selecionar região (recomendado: mesma que você usa)
5. Aguardar criação completa

### Passo 2: Executar SQLs na Ordem

**ORDEM CRÍTICA:**

1. `docs/create-onboarding-table.sql` - Onboarding
2. `docs/migrations/create-bills-table.sql` - Contas a pagar
3. `docs/migrations/create-incomes-table.sql` - Entradas
4. `docs/migrations/add-privacy-architecture.sql` - Arquitetura de privacidade (is_shared)
5. `docs/migrations/add-organization-type-column.sql` - Coluna type em organizations
6. `docs/migrations/fix-solo-cost-center-percentage.sql` - Trigger para cost centers solo
7. `docs/migrations/add-rebalance-on-second-member.sql` - Trigger de rebalanceamento
8. `docs/migrations/fix-expense-splits-cascade.sql` - CASCADE em deletes

### Passo 3: Atualizar Variáveis de Ambiente

**web/.env.local:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-novo-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-nova-anon-key
```

**Backend (.env):**
```bash
SUPABASE_URL=https://seu-novo-projeto.supabase.co
SUPABASE_KEY=sua-nova-service-key
```

### Passo 4: Testar

1. Reiniciar `npm run dev` (web)
2. Acessar `/account-type`
3. Criar conta de teste (solo e família)
4. Verificar criação de cost centers corretos
5. Testar criação de despesas/entradas
6. Verificar gráficos

---

## ⚠️ Observações Importantes

1. **RLS (Row Level Security)**
   - Todas as tabelas estão com RLS DESABILITADO
   - Re-ativar quando criar políticas de segurança

2. **Triggers**
   - `auto_create_cost_center_for_user` - Cria cost center automaticamente
   - `rebalance_split_percentages_on_new_member` - Rebalanceia percentuais
   - Esses triggers são CRÍTICOS para o funcionamento correto

3. **Dados de Teste**
   - Após migração, criar manualmente:
     - Uma organização
     - Um usuário
     - Testar fluxo completo

---

## 📝 Checklist de Migração

- [ ] Criar novo projeto no Supabase
- [ ] Copiar SQLs para SQL Editor (na ordem)
- [ ] Executar cada SQL sequencialmente
- [ ] Verificar se todas as tabelas foram criadas
- [ ] Atualizar .env.local (web)
- [ ] Atualizar .env (backend)
- [ ] Reiniciar aplicação
- [ ] Testar criação de conta solo
- [ ] Testar criação de conta família
- [ ] Testar criação de despesa
- [ ] Testar criação de entrada
- [ ] Verificar gráficos
- [ ] Testar contas a pagar
- [ ] Testar onboarding

---

## 🚨 Problemas Comuns

1. **Erro de FK constraint**
   - Verificar ordem de criação das tabelas
   - Executar SQLs na ordem exata

2. **Trigger não funciona**
   - Verificar se função foi criada corretamente
   - Ver logs no SQL Editor

3. **Variáveis de ambiente não carregam**
   - Verificar se arquivo .env.local existe
   - Reiniciar servidor após mudanças

---

## ✅ Resultado Esperado

Após migração bem-sucedida:

- ✅ Todas as tabelas criadas
- ✅ Triggers funcionando
- ✅ Variáveis atualizadas
- ✅ App carregando normalmente
- ✅ Criar conta funcionando
- ✅ Dashboard funcionando
- ✅ Gráficos funcionando


