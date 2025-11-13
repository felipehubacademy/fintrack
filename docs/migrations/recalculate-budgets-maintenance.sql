-- ============================================================================
-- Script de Manutenção: Recalcular Budgets
-- Data: 12/11/2025
-- Descrição: Script que pode ser rodado sempre que necessário para
--            sincronizar budgets.current_spent com despesas reais
-- ============================================================================

-- Opção 1: Recalcular todos os budgets do mês atual
-- ============================================
SELECT recalculate_budget_spent(id) 
FROM budgets 
WHERE DATE_TRUNC('month', month_year) = DATE_TRUNC('month', CURRENT_DATE);

-- Opção 2: Recalcular budgets de um mês específico
-- ============================================
-- Ajuste a data conforme necessário
/*
SELECT recalculate_budget_spent(id) 
FROM budgets 
WHERE DATE_TRUNC('month', month_year) = DATE_TRUNC('month', '2025-11-01'::DATE);
*/

-- Opção 3: Recalcular TODOS os budgets (pode ser lento)
-- ============================================
/*
DO $$
DECLARE
  v_budget RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando recalculo de todos os budgets...';
  
  FOR v_budget IN 
    SELECT id FROM budgets ORDER BY month_year DESC
  LOOP
    PERFORM recalculate_budget_spent(v_budget.id);
    v_count := v_count + 1;
    
    -- Log a cada 100 budgets
    IF v_count % 100 = 0 THEN
      RAISE NOTICE 'Processados % budgets...', v_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Recalculo concluido: % budgets atualizados', v_count;
END $$;
*/

-- Opção 4: Verificar status antes e depois
-- ============================================
-- Executar ANTES do recalculo
CREATE TEMP TABLE IF NOT EXISTS budget_comparison_before AS
SELECT 
  id,
  category_id,
  month_year,
  limit_amount,
  current_spent,
  NOW() as snapshot_time
FROM budgets
WHERE DATE_TRUNC('month', month_year) = DATE_TRUNC('month', CURRENT_DATE);

-- [Executar o recalculo aqui]

-- Executar DEPOIS do recalculo para comparar
SELECT 
  b.id,
  bc.name as category,
  b.month_year,
  b.limit_amount,
  bb.current_spent as spent_before,
  b.current_spent as spent_after,
  (b.current_spent - bb.current_spent) as difference
FROM budgets b
LEFT JOIN budget_comparison_before bb ON b.id = bb.id
LEFT JOIN budget_categories bc ON b.category_id = bc.id
WHERE DATE_TRUNC('month', b.month_year) = DATE_TRUNC('month', CURRENT_DATE)
  AND ABS(b.current_spent - bb.current_spent) > 0.01
ORDER BY ABS(b.current_spent - bb.current_spent) DESC;

-- Limpar tabela temporária
DROP TABLE IF EXISTS budget_comparison_before;

