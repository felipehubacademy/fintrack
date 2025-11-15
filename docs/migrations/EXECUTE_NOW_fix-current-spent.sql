-- ============================================================================
-- FIX URGENTE: Budget Tracking com tabela EXPENSES
-- Execute este SQL no Supabase SQL Editor
-- ============================================================================

-- 1. Adicionar coluna current_spent se não existir
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budgets' AND column_name = 'current_spent'
  ) THEN
    ALTER TABLE budgets ADD COLUMN current_spent DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE '✅ Coluna current_spent criada';
  ELSE
    RAISE NOTICE '✅ Coluna current_spent já existe';
  END IF;
END $$;

-- 2. Criar função para recalcular budget
-- ============================================================================
CREATE OR REPLACE FUNCTION recalculate_budget_spent(p_budget_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_spent DECIMAL(10,2);
  v_budget RECORD;
BEGIN
  -- Buscar informações do budget
  SELECT 
    b.id,
    b.organization_id,
    b.category_id,
    b.month_year
  INTO v_budget
  FROM budgets b
  WHERE b.id = p_budget_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular total gasto baseado nas EXPENSES do mês
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total_spent
  FROM expenses e
  WHERE e.organization_id = v_budget.organization_id
    AND e.category_id = v_budget.category_id
    AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', v_budget.month_year);
  
  -- Atualizar current_spent
  UPDATE budgets
  SET current_spent = v_total_spent,
      updated_at = NOW()
  WHERE id = p_budget_id;
  
  RAISE NOTICE 'Budget % atualizado: R$ %', p_budget_id, v_total_spent;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_budget_on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
  v_budget_id UUID;
BEGIN
  -- Para INSERT
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO v_budget_id
    FROM budgets
    WHERE organization_id = NEW.organization_id
      AND category_id = NEW.category_id
      AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', NEW.date);
    
    IF v_budget_id IS NOT NULL THEN
      PERFORM recalculate_budget_spent(v_budget_id);
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Para UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Atualizar budget da categoria NOVA
    SELECT id INTO v_budget_id
    FROM budgets
    WHERE organization_id = NEW.organization_id
      AND category_id = NEW.category_id
      AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', NEW.date);
    
    IF v_budget_id IS NOT NULL THEN
      PERFORM recalculate_budget_spent(v_budget_id);
    END IF;
    
    -- Se categoria ou data mudou, atualizar budget ANTIGO também
    IF OLD.category_id != NEW.category_id OR 
       DATE_TRUNC('month', OLD.date) != DATE_TRUNC('month', NEW.date) THEN
      
      SELECT id INTO v_budget_id
      FROM budgets
      WHERE organization_id = OLD.organization_id
        AND category_id = OLD.category_id
        AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', OLD.date);
      
      IF v_budget_id IS NOT NULL THEN
        PERFORM recalculate_budget_spent(v_budget_id);
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO v_budget_id
    FROM budgets
    WHERE organization_id = OLD.organization_id
      AND category_id = OLD.category_id
      AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', OLD.date);
    
    IF v_budget_id IS NOT NULL THEN
      PERFORM recalculate_budget_spent(v_budget_id);
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar/Recriar trigger
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_budget_on_expense ON expenses;

CREATE TRIGGER trigger_update_budget_on_expense
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_budget_on_expense_change();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger criado na tabela EXPENSES';
END $$;

-- 5. Recalcular TODOS os budgets existentes
-- ============================================================================
DO $$
DECLARE
  v_budget RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Iniciando recálculo de todos os budgets...';
  
  FOR v_budget IN 
    SELECT id FROM budgets ORDER BY month_year DESC
  LOOP
    PERFORM recalculate_budget_spent(v_budget.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Recálculo concluído: % budgets atualizados', v_count;
END $$;

-- 6. Verificação final
-- ============================================================================
SELECT 
  'NOVEMBRO 2025' as periodo,
  COUNT(*) as total_budgets,
  SUM(limit_amount) as total_orcado,
  SUM(current_spent) as total_gasto
FROM budgets
WHERE month_year = '2025-11-01'
  AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f';

-- ============================================================================
-- FIM - Atualize a página de orçamentos para ver os valores!
-- ============================================================================

