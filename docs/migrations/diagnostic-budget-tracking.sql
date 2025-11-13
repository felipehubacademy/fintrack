-- ============================================================================
-- Script de Diagnóstico: Budget Tracking
-- Data: 12/11/2025
-- Descrição: Diagnosticar problemas no tracking de despesas vs budgets
-- ============================================================================

-- 1. Verificar se o trigger existe e está ativo
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_budget_on_expense';

-- 2. Verificar se a função do trigger existe
-- ============================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name IN ('update_budget_on_expense_change', 'recalculate_budget_spent');

-- 3. Listar despesas do mês atual SEM category_id
-- ============================================
SELECT 
  COUNT(*) as total_sem_category,
  SUM(amount) as valor_total_sem_category,
  array_agg(DISTINCT category) as categorias_texto_usadas
FROM expenses
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'confirmed'
  AND category_id IS NULL;

-- 4. Comparar total de expenses vs budgets.current_spent (mês atual)
-- ============================================
WITH expense_totals AS (
  SELECT 
    organization_id,
    category_id,
    category,
    COUNT(*) as num_expenses,
    SUM(amount) as total_expense
  FROM expenses
  WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
    AND status = 'confirmed'
  GROUP BY organization_id, category_id, category
),
budget_totals AS (
  SELECT 
    b.organization_id,
    b.category_id,
    bc.name as category_name,
    b.limit_amount,
    b.current_spent,
    b.month_year
  FROM budgets b
  LEFT JOIN budget_categories bc ON b.category_id = bc.id
  WHERE DATE_TRUNC('month', b.month_year) = DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  COALESCE(e.organization_id, b.organization_id) as org_id,
  COALESCE(e.category_id, b.category_id) as cat_id,
  COALESCE(b.category_name, e.category) as category,
  e.num_expenses,
  e.total_expense,
  b.current_spent,
  b.limit_amount,
  CASE 
    WHEN e.total_expense IS NULL THEN 'Budget sem despesas'
    WHEN b.current_spent IS NULL THEN 'Despesas sem budget'
    WHEN ABS(e.total_expense - b.current_spent) > 0.01 THEN 'DIVERGENCIA'
    ELSE 'OK'
  END as status,
  ABS(COALESCE(e.total_expense, 0) - COALESCE(b.current_spent, 0)) as diferenca
FROM expense_totals e
FULL OUTER JOIN budget_totals b 
  ON e.organization_id = b.organization_id 
  AND e.category_id = b.category_id
ORDER BY diferenca DESC;

-- 5. Resumo geral do mês atual
-- ============================================
SELECT 
  'Total Expenses (confirmed)' as metric,
  COUNT(*) as count,
  SUM(amount) as total
FROM expenses
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'confirmed'
UNION ALL
SELECT 
  'Expenses COM category_id' as metric,
  COUNT(*) as count,
  SUM(amount) as total
FROM expenses
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'confirmed'
  AND category_id IS NOT NULL
UNION ALL
SELECT 
  'Expenses SEM category_id' as metric,
  COUNT(*) as count,
  SUM(amount) as total
FROM expenses
WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'confirmed'
  AND category_id IS NULL
UNION ALL
SELECT 
  'Total Budgets (current_spent)' as metric,
  COUNT(*) as count,
  SUM(current_spent) as total
FROM budgets
WHERE DATE_TRUNC('month', month_year) = DATE_TRUNC('month', CURRENT_DATE);

-- 6. Verificar índices existentes
-- ============================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'expenses'
  AND (indexname LIKE '%category%' OR indexname LIKE '%date%');

-- 7. Testar recalculo manual para um budget específico
-- ============================================
-- NOTA: Comentado para não executar automaticamente
-- Descomente e ajuste o UUID para testar:
/*
DO $$
DECLARE
  test_budget_id UUID;
  old_spent DECIMAL(10,2);
  new_spent DECIMAL(10,2);
BEGIN
  -- Pegar o primeiro budget do mês atual
  SELECT id, current_spent INTO test_budget_id, old_spent
  FROM budgets
  WHERE DATE_TRUNC('month', month_year) = DATE_TRUNC('month', CURRENT_DATE)
  LIMIT 1;
  
  IF test_budget_id IS NOT NULL THEN
    RAISE NOTICE 'Testando recalculo para budget ID: %', test_budget_id;
    RAISE NOTICE 'Current_spent antes: %', old_spent;
    
    -- Executar recalculo
    PERFORM recalculate_budget_spent(test_budget_id);
    
    -- Verificar novo valor
    SELECT current_spent INTO new_spent
    FROM budgets
    WHERE id = test_budget_id;
    
    RAISE NOTICE 'Current_spent depois: %', new_spent;
    RAISE NOTICE 'Diferenca: %', (new_spent - old_spent);
  ELSE
    RAISE NOTICE 'Nenhum budget encontrado para o mês atual';
  END IF;
END $$;
*/

-- 8. Identificar categorias que precisam de match retroativo
-- ============================================
-- Despesas com category (texto) mas sem category_id
SELECT 
  e.category as category_text,
  COUNT(*) as num_expenses,
  SUM(e.amount) as total_amount,
  bc.id as matching_category_id,
  bc.name as matching_category_name
FROM expenses e
LEFT JOIN budget_categories bc ON LOWER(TRIM(e.category)) = LOWER(TRIM(bc.name))
WHERE e.category_id IS NULL
  AND e.category IS NOT NULL
  AND DATE_TRUNC('month', e.date) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
GROUP BY e.category, bc.id, bc.name
ORDER BY num_expenses DESC;

