# Aplicar Migrations no Supabase

## Ordem de execução (OBRIGATÓRIA)

### 1. Primeiro: Estrutura de Privacidade
**Arquivo:** `docs/migrations/add-privacy-architecture.sql`

**O que faz:**
- Adiciona coluna `is_shared` nas tabelas (cards, budgets, expenses, incomes, etc)
- Cria índices de performance
- Migra dados existentes

**Por que primeiro:**
- Prepara base para sistema de privacidade
- Frontend já usa esses campos

---

### 2. Segundo: Fix Cost Center Solo
**Arquivo:** `docs/migrations/fix-solo-cost-center-percentage.sql`

**O que faz:**
- Atualiza trigger para criar cost centers com 100% para contas solo
- Evita duplicação de cost centers
- Mantém contas familiares intactas (cria com 50%)

**Por que depois:**
- Depende do trigger existente
- Apenas corrige comportamento

---

## Como aplicar

### No Supabase Dashboard:

1. Acesse **SQL Editor**
2. Clique em **New Query**
3. **Cole e execute** o SQL do arquivo 1
4. **Cole e execute** o SQL do arquivo 2

**Pronto! ✅**

---

## O que NÃO aplicar (ainda)

❌ `docs/migrations/update-rls-privacy-policies.sql` - Desabilitado por hora (contém apenas comentários)

---

## Resultado

Após aplicar:
- ✅ Campos `is_shared` em todas as tabelas
- ✅ Índices de performance criados
- ✅ Dados migrados automaticamente
- ✅ Cost centers de contas solo com 100%
- ✅ Sem duplicação de cost centers

