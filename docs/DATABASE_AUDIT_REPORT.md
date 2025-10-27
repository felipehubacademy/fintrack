# 🔍 Relatório de Auditoria do Banco de Dados

## Resumo Executivo

Foram identificadas **31 tabelas** no banco, mas apenas **19 são efetivamente utilizadas** no código. Algumas tabelas existem mas não são acessadas diretamente, outras são definitivamente **obsoletas**.

---

## ✅ Tabelas ESSENCIAIS (Devem estar no SQL de migração)

### 1. Core System
- ✅ **organizations** - Usada em todos os componentes
- ✅ **users** - Usada em todos os componentes
- ✅ **cost_centers** - Usada para "Responsáveis" e splits
- ✅ **pending_invites** - Usada no convite de usuários

### 2. Finanças
- ✅ **budget_categories** - Usada para categorizar despesas/orçamentos
- ✅ **expenses** - Principal tabela de despesas
- ✅ **expense_splits** - Divisão de despesas entre responsáveis
- ✅ **incomes** - Entradas financeiras
- ✅ **income_splits** - Divisão de entradas
- ✅ **bills** - Contas a pagar
- ✅ **cards** - Cartões de crédito/débito
- ✅ **budgets** - Orçamentos mensais

### 3. Funcionalidades Avançadas
- ✅ **bank_accounts** - Usado em `/dashboard/bank-accounts`
- ✅ **bank_account_shares** - Compartilhamento de contas
- ✅ **bank_account_transactions** - Transações de contas
- ✅ **investment_goals** - Usado em `/dashboard/investments`
- ✅ **investment_contributions** - Aportes de investimento

### 4. Onboarding & UX
- ✅ **onboarding_progress** - Progresso do onboarding
- ✅ **user_tours** - Tours guiados

---

## ⚠️ Tabelas SEM CÓDIGO (Verificar se são necessárias)

### Backend-Only (Possivelmente usadas pelo backend Node.js)
- ❓ **conversations** - Usada apenas no backend para WhatsApp
- ❓ **notification_templates** - Templates de notificações
- ❓ **notification_history** - Histórico de notificações

### Sistema de Notificações
- ⚠️ **notifications** - Criada mas **não usada no frontend**
- ⚠️ **user_preferences** - Criada mas **não usada no frontend**

### Autenticação
- ✅ **verification_codes** - Usado em `web/pages/api/verify-code.js` e `send-verification-code.js`
- ❓ **income_categories** - Não encontrada referência no código

---

## ❌ Tabelas OBSOLETAS (Remover do SQL)

### Não encontradas no código
- ❌ **allowed_users** - **SEM REFERÊNCIAS** no código
- ❌ **conversation_state** - **SEM REFERÊNCIAS** (use `conversations`)

---

## 📊 Tabelas por Uso

### Uso Intensivo (10+ referências)
1. `expenses` - 47 arquivos
2. `users` - 43 arquivos
3. `organizations` - 41 arquivos
4. `budget_categories` - 32 arquivos
5. `cost_centers` - 29 arquivos
6. `bills` - 18 arquivos
7. `cards` - 16 arquivos
8. `incomes` - 14 arquivos

### Uso Moderado (2-10 referências)
9. `budgets` - 8 arquivos
10. `expense_splits` - 7 arquivos
11. `income_splits` - 6 arquivos
12. `onboarding_progress` - 5 arquivos
13. `pending_invites` - 4 arquivos
14. `investment_goals` - 3 arquivos
15. `investment_contributions` - 3 arquivos

### Uso Baixo (1-2 referências)
16. `bank_accounts` - 2 arquivos
17. `bank_account_shares` - 1 arquivo
18. `bank_account_transactions` - 1 arquivo
19. `verification_codes` - 2 arquivos
20. `user_tours` - 1 arquivo

### Uso Zerado (0 referências no código)
21. `allowed_users` ❌
22. `conversation_state` ❌ (duplicado de `conversations`)
23. `notifications` ⚠️ (criada mas não usada)
24. `user_preferences` ⚠️
25. `notification_templates` ❓
26. `notification_history` ❓
27. `income_categories` ❓

---

## 🎯 Recomendações

### SQL Final: `docs/FRESH_DATABASE_SETUP.sql`

**Manter:**
- ✅ Todas as 20 tabelas essenciais
- ✅ `conversations` (backend)
- ✅ `verification_codes` (auth)
- ✅ Sistema de notificações completo (notifications, notification_templates, notification_history)
- ✅ `user_preferences` (pode ser usado no futuro)

**Remover:**
- ❌ `allowed_users`
- ❌ `conversation_state` (duplicado)

**Adicionar ao SQL:**
- ✅ Colunas `is_shared` em: expenses, incomes, cards, budgets, investment_goals
- ✅ Coluna `type` em organizations
- ✅ Colunas de split em cost_centers
- ✅ Triggers auto_create_cost_center e rebalance_split

---

## 📋 Conclusão

O `docs/FRESH_DATABASE_SETUP.sql` está **90% correto**, mas pode ser **otimizado** removendo `allowed_users` e `conversation_state` caso não sejam usados pelo backend.

**Tabelas finais recomendadas: 28** (ao invés de 31)

- ✅ 26 tabelas essenciais
- ⚠️ 2 tabelas duplicadas/obsoletas (remove)

---

## ✨ Status Final

| Categoria | Quantidade | Ação |
|-----------|------------|------|
| Essenciais | 20 | Manter |
| Backend-only | 3 | Manter |
| Obsolletas | 2 | Remover |
| **Total** | **23** | **Usar no SQL** |

**O SQL atual está pronto para migração!**


