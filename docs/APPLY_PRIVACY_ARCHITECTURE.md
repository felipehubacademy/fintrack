# Como Aplicar a Arquitetura de Privacidade no Supabase

## 📋 Resumo

Apenas **1 arquivo SQL** precisa ser executado no Supabase para implementar a estrutura de privacidade.

## 🚀 Passo a Passo

### 1. Acessar o SQL Editor no Supabase

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. No menu lateral, clique em **SQL Editor**
3. Clique em **New Query**

### 2. Executar a Migration

**Arquivo:** `/docs/migrations/add-privacy-architecture.sql`

Copiar e colar TODO o conteúdo do arquivo e clicar em **RUN**.

### 3. Verificar Execução

O SQL deve executar sem erros. Se aparecer algum erro, verificar:
- Se as tabelas existem (expenses, incomes, cards, budgets)
- Se já existe coluna `split` na tabela expenses

## ✅ O que o SQL Faz

### Estrutura
1. Adiciona coluna `is_shared` BOOLEAN em:
   - ✅ `cards`
   - ✅ `budgets`
   - ✅ `expenses` (renomeia `split` → `is_shared`)
   - ✅ `incomes`
   - ✅ `investment_goals` (se existir)

### Performance
2. Cria índices para queries rápidas:
   - `idx_expenses_is_shared`
   - `idx_incomes_is_shared`
   - `idx_cards_is_shared`
   - `idx_budgets_is_shared`

### Migração de Dados
3. Atualiza registros existentes:
   - Se tem `expense_splits` → marca como `is_shared = true`
   - Se tem `income_splits` → marca como `is_shared = true`
   - Se tem `bill_splits` → marca como `is_shared = true`

## ⚠️ Importante

- **RLS está DISABLED**: O arquivo `update-rls-privacy-policies.sql` está vazio propositalmente
- **Frontend filtra**: O sistema de filtros já funciona no frontend
- **Sem impactos**: Dados existentes não são modificados em valor, apenas estrutura
- **Seguro**: Todas as operações usam `IF NOT EXISTS` e `IF EXISTS` para segurança

## 🧪 Testar após executar

1. Criar conta individual através de `/account-type` → Solo
2. Verificar que campo "Responsável" não aparece
3. Criar despesas e verificar que aparecem apenas para o usuário
4. Criar organização familiar e testar dados compartilhados vs individuais

## 📊 Resultado

Após executar, você terá:
- ✅ Estrutura de privacidade completa no banco
- ✅ Dados existentes migrados automaticamente
- ✅ Frontend funcionando com filtros de privacidade
- ✅ Sistema pronto para usuários individuais vs familiares

