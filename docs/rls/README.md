# Row Level Security (RLS) Implementation Guide

Este diretório contém todos os scripts SQL necessários para implementar Row Level Security (RLS) no Supabase para o projeto FinTrack.

## 📋 Visão Geral

O RLS garante que usuários só possam acessar dados da própria organização, adicionando uma camada de segurança no banco de dados além das validações já existentes no código da aplicação.

## 📁 Estrutura dos Arquivos

1. **`01-create-helper-functions.sql`** - Funções auxiliares para simplificar as policies
2. **`02-organizations-policies.sql`** - Policies para tabela `organizations`
3. **`03-users-policies.sql`** - Policies para tabela `users`
4. **`04-financial-tables-policies.sql`** - Policies para todas as tabelas financeiras
5. **`05-system-tables-policies.sql`** - Policies para tabelas de sistema
6. **`06-apply-all-policies.sql`** - Script master para verificar aplicação
7. **`ROLLBACK.sql`** - Script para desabilitar RLS (apenas em emergência)

## 🚀 Como Aplicar

### Ordem de Execução (Obrigatória)

Execute os scripts no SQL Editor do Supabase **na ordem abaixo**:

```sql
-- 1. Criar funções helper (base para todas as policies)
\i docs/rls/01-create-helper-functions.sql

-- 2. Organizations (tabela base)
\i docs/rls/02-organizations-policies.sql

-- 3. Users (dependente de organizations)
\i docs/rls/03-users-policies.sql

-- 4. Tabelas financeiras
\i docs/rls/04-financial-tables-policies.sql

-- 5. Tabelas de sistema
\i docs/rls/05-system-tables-policies.sql

-- 6. Verificação (opcional)
\i docs/rls/06-apply-all-policies.sql
```

**OU** copie e cole cada arquivo no SQL Editor do Supabase na ordem acima.

### Verificação

Após aplicar todos os scripts, execute para verificar:

```sql
-- Ver tabelas com RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- Ver policies criadas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## 🔒 Padrões de Segurança Implementados

### Tabelas com `organization_id`
- **SELECT**: Usuário só vê dados da própria organização
- **INSERT**: Usuário só pode criar registros na própria organização
- **UPDATE**: Usuário só pode atualizar registros da própria organização
- **DELETE**: Usuário só pode deletar registros da própria organização

### Tabelas Especiais

#### `budget_categories`
- Permite acesso a categorias globais (`organization_id IS NULL`)
- Usuários podem criar/editar apenas categorias da própria organização

#### `users`
- Usuários veem membros da própria organização
- Admin pode atualizar membros da organização
- Self-service signup permitido

#### `organizations`
- Membros podem ver própria organização
- Apenas admin pode atualizar
- INSERT/DELETE apenas via service role

### Tabelas Relacionais (Splits)
- Acesso controlado via tabela pai (expense/income/bank_account)
- Validam que registro pai pertence à organização

## ⚠️ Considerações Importantes

### Service Role (Backend)
- Backend/webhooks usam `SUPABASE_SERVICE_ROLE_KEY`
- Service role **bypassa RLS automaticamente**
- Webhooks do WhatsApp continuarão funcionando normalmente

### Categorias Globais
- Categorias com `organization_id = NULL` são visíveis para todos
- Usuários não podem criar/editar categorias globais via RLS
- Apenas service role pode gerenciar categorias globais

### Triggers SECURITY DEFINER
- Funções como `auto_create_cost_center_for_user()` executam com privilégios elevados
- Funcionam normalmente mesmo com RLS ativo

## 🔄 Rollback

Se necessário desabilitar RLS temporariamente:

```sql
-- Execute o arquivo ROLLBACK.sql
\i docs/rls/ROLLBACK.sql
```

**⚠️ ATENÇÃO**: Rollback remove proteção RLS. Use apenas em testes ou emergência.

## ✅ Checklist de Testes

Após aplicar RLS, teste:

- [ ] Login como usuário e verificar acesso ao dashboard
- [ ] Tentar acessar dados de outra organização (deve falhar)
- [ ] Criar nova despesa/entrada (deve funcionar)
- [ ] Ver categorias globais (deve aparecer)
- [ ] Webhook WhatsApp salva despesa (deve funcionar - usa service role)
- [ ] Convite de usuário funciona
- [ ] Admin pode atualizar membros

## 📝 Tabelas Cobertas

✅ **Core**: organizations, users, cost_centers, pending_invites  
✅ **Financeiras**: expenses, expense_splits, incomes, income_splits, bills, cards, budgets, budget_categories  
✅ **Avançadas**: bank_accounts, bank_account_shares, bank_account_transactions, investment_goals, investment_contributions  
✅ **Sistema**: conversations, notifications, notification_templates, notification_history, onboarding_progress, user_tours, user_preferences, verification_codes

## 🐛 Troubleshooting

### Erro: "Função não encontrada"
- Execute primeiro `01-create-helper-functions.sql`

### RLS bloqueando acesso legítimo
- Verifique se `organization_id` do usuário está correto na tabela `users`
- Verifique se usuário está autenticado (`auth.uid()` não é NULL)
- Use `ROLLBACK.sql` temporariamente para debug

### Webhook não funciona
- Webhooks usam service role - devem funcionar mesmo com RLS
- Se não funcionar, verifique se está usando `SUPABASE_SERVICE_ROLE_KEY`

## 📚 Referências

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

