# Budget Tracking - Diagnóstico e Correção

Este diretório contém scripts SQL para diagnosticar e corrigir problemas no sistema de tracking de despesas vs budgets.

## Problema Identificado

Despesas não estão sendo corretamente contabilizadas nos budgets (ex: R$15.000 de despesas, mas apenas R$970,73 trackiado).

## Como Usar

### 1. Diagnóstico (Executar Primeiro)

Execute o script de diagnóstico para identificar problemas:

```bash
psql -U seu_usuario -d fintrack -f docs/migrations/diagnostic-budget-tracking.sql > diagnostico-resultado.txt
```

O script irá verificar:
- ✅ Se o trigger existe e está ativo
- ✅ Despesas sem `category_id`
- ✅ Divergências entre `expenses.amount` e `budgets.current_spent`
- ✅ Índices existentes
- ✅ Resumo geral do mês

### 2. Correção (Se Necessário)

Se o diagnóstico identificar problemas, execute o script de correção:

```bash
psql -U seu_usuario -d fintrack -f docs/migrations/fix-budget-tracking.sql
```

Este script irá:
- ✅ Recriar funções e triggers
- ✅ Fazer match retroativo de `category_id` baseado no campo `category` (texto)
- ✅ Adicionar índices para performance
- ✅ Recalcular todos os budgets existentes

### 3. Manutenção (Quando Necessário)

Para recalcular budgets manualmente (sincronização):

```bash
psql -U seu_usuario -d fintrack -f docs/migrations/recalculate-budgets-maintenance.sql
```

Opções disponíveis no script:
- Recalcular apenas mês atual (padrão)
- Recalcular mês específico
- Recalcular TODOS os budgets
- Comparar antes/depois

## Verificação Pós-Correção

Após executar a correção, rode novamente o diagnóstico para confirmar:

```bash
psql -U seu_usuario -d fintrack -f docs/migrations/diagnostic-budget-tracking.sql
```

Espera-se ver:
- Trigger ativo ✅
- Divergências zeradas ou mínimas (< R$0,01) ✅
- Despesas com `category_id` preenchido ✅

## Monitoramento Contínuo

Para verificar a saúde do sistema regularmente, você pode:

1. **Query rápida de verificação:**
```sql
-- Ver resumo do mês atual
SELECT 
  'Total Expenses' as metric,
  COUNT(*) as count,
  SUM(amount) as total
FROM expenses
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'confirmed'
UNION ALL
SELECT 
  'Total Budgets current_spent' as metric,
  COUNT(*) as count,
  SUM(current_spent) as total
FROM budgets
WHERE DATE_TRUNC('month', month_year) = DATE_TRUNC('month', CURRENT_DATE);
```

2. **Automatizar (opcional):**
Criar um cron job que execute o diagnóstico semanalmente e envie alertas se encontrar divergências > 1%.

## Troubleshooting

### Problema: Trigger não dispara

**Solução:** Execute novamente a seção de criação de trigger em `fix-budget-tracking.sql`

### Problema: Despesas antigas sem category_id

**Solução:** 
1. Verificar se as categorias existem na tabela `budget_categories`
2. Ajustar manualmente ou criar script adicional de match baseado em keywords

### Problema: Performance lenta

**Solução:**
1. Verificar se os índices foram criados: `idx_expenses_category_date`, `idx_expenses_org_category_month`
2. Se necessário, criar índices adicionais baseado nos padrões de query

## Suporte

Se os scripts não resolverem o problema:
1. Compartilhar o arquivo `diagnostico-resultado.txt`
2. Executar query detalhada de divergências (query #4 do diagnostic script)
3. Verificar logs da aplicação para erros ao salvar despesas

