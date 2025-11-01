# 🔧 Troubleshooting RLS - Problemas e Soluções

## Problema: Não vejo transações/stats no dashboard

### Causa Provável
As funções helper podem estar falhando ao buscar o `organization_id` do usuário devido à política RLS na tabela `users`.

### Solução Rápida (EMERGÊNCIA)

1. **Execute o fix das funções helper:**
   ```sql
   -- Execute no SQL Editor do Supabase:
   -- docs/rls/FIX-helper-functions.sql
   ```

2. **Corrija a política de users:**
   ```sql
   -- Execute no SQL Editor do Supabase:
   -- docs/rls/FIX-users-policy.sql
   ```

3. **Teste novamente:**
   - Recarregue o dashboard
   - Verifique se as transações aparecem

### Solução Temporária (Se ainda não funcionar)

Se ainda estiver bloqueado, desabilite RLS temporariamente para debug:

```sql
-- Execute docs/rls/FIX-emergency-disable-rls.sql
-- ⚠️ ATENÇÃO: Isso remove proteção. Use apenas para debug!
```

Depois de identificar o problema, reabilite RLS executando novamente os scripts principais.

## Problemas Comuns

### 1. Funções Helper não funcionam

**Sintoma:** Queries retornam vazio mesmo com dados existentes

**Causa:** A função `get_user_organization_id()` não consegue acessar a tabela `users`

**Solução:**
- Execute `FIX-helper-functions.sql` (versão corrigida que usa `auth.uid()` primeiro)
- Verifique se o usuário tem `organization_id` preenchido na tabela `users`

### 2. Joins com tabelas relacionadas falham

**Sintoma:** Queries com `expense_splits` ou `cost_centers` retornam erro

**Causa:** Policies de splits podem estar bloqueando joins

**Solução:**
- As policies de splits já validam via tabela pai
- Se ainda falhar, verifique se `expense_id` está correto

### 3. Categorias globais não aparecem

**Sintoma:** Não vejo categorias padrão (como "Alimentação", "Transporte")

**Causa:** Policy pode estar bloqueando `organization_id IS NULL`

**Solução:**
- Verifique se a policy de `budget_categories` inclui:
  ```sql
  organization_id IS NULL OR user_belongs_to_org(organization_id)
  ```

### 4. Webhook WhatsApp não funciona

**Sintoma:** Despesas não são salvas via WhatsApp

**Causa:** Webhook pode não estar usando service role

**Solução:**
- Verifique se o backend usa `SUPABASE_SERVICE_ROLE_KEY`
- Service role bypassa RLS automaticamente
- Se ainda falhar, verifique logs do backend

## Debug Steps

### 1. Verificar Funções Helper

```sql
-- Testar se a função retorna organization_id
SELECT get_user_organization_id() as org_id;

-- Deve retornar um UUID, não NULL
```

### 2. Verificar Políticas Ativas

```sql
-- Ver policies da tabela expenses
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'expenses';
```

### 3. Testar Query Manualmente

```sql
-- Fazer login como usuário no Supabase (Auth > Users)
-- Depois testar esta query:
SELECT * FROM expenses LIMIT 10;

-- Se retornar vazio mas você sabe que tem dados, o RLS está bloqueando
```

### 4. Verificar Dados do Usuário

```sql
-- Verificar se usuário tem organization_id
SELECT id, email, organization_id, is_active
FROM users
WHERE email = '<seu-email>';

-- organization_id NÃO deve ser NULL
```

## Checklist de Verificação

- [ ] Usuário está autenticado (`auth.uid()` não é NULL)
- [ ] Usuário tem `organization_id` na tabela `users`
- [ ] `organization_id` não é NULL
- [ ] `is_active = true` na tabela `users`
- [ ] Funções helper foram atualizadas com `FIX-helper-functions.sql`
- [ ] Política de `users` foi corrigida com `FIX-users-policy.sql`
- [ ] RLS está habilitado nas tabelas (`rowsecurity = true`)

## Reabilitar RLS Após Debug

Se você desabilitou RLS temporariamente, reabilite executando:

1. `01-create-helper-functions.sql` (ou `FIX-helper-functions.sql`)
2. `02-organizations-policies.sql`
3. `FIX-users-policy.sql`
4. `04-financial-tables-policies.sql`
5. `05-system-tables-policies.sql`

## Logs Úteis

Verifique logs no console do navegador (F12):
- Erros de Supabase
- Queries que retornam vazio
- Erros de autenticação

Verifique logs no Supabase Dashboard:
- Database > Logs
- Auth > Logs

## Suporte

Se nenhuma solução funcionar:
1. Execute `ROLLBACK.sql` para desabilitar todo RLS
2. Documente o problema específico
3. Reabilite RLS incrementalmente (uma tabela por vez)

