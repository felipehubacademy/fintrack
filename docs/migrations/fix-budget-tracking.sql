-- ============================================================================
-- Migration: Fix Budget Tracking Issues
-- Data: 12/11/2025
-- Descrição: Corrigir problemas de tracking identificados no diagnóstico
-- ============================================================================

-- 1. Criar/Recriar trigger se não existir ou estiver com problemas
-- ============================================
-- Primeiro, garantir que a função existe
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
  
  -- Calcular total gasto baseado nas despesas confirmadas do mês
  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_total_spent
  FROM expenses e
  WHERE e.organization_id = v_budget.organization_id
    AND e.category_id = v_budget.category_id
    AND e.status = 'confirmed'
    AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', v_budget.month_year);
  
  -- Atualizar current_spent
  UPDATE budgets
  SET current_spent = v_total_spent,
      updated_at = NOW()
  WHERE id = p_budget_id;
END;
$$ LANGUAGE plpgsql;

-- Criar função trigger
CREATE OR REPLACE FUNCTION update_budget_on_expense_change()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id UUID;
  v_organization_id UUID;
  v_expense_date DATE;
  v_budget_id UUID;
  v_should_process BOOLEAN := false;
BEGIN
  -- Verificar se deve processar baseado na operação e status
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'confirmed' THEN
      v_category_id := OLD.category_id;
      v_organization_id := OLD.organization_id;
      v_expense_date := OLD.date;
      v_should_process := true;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status = 'confirmed' THEN
      v_category_id := NEW.category_id;
      v_organization_id := NEW.organization_id;
      v_expense_date := NEW.date;
      v_should_process := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' OR NEW.status = 'confirmed' THEN
      v_category_id := NEW.category_id;
      v_organization_id := NEW.organization_id;
      v_expense_date := NEW.date;
      v_should_process := true;
      
      -- Se categoria mudou, atualizar ambos os budgets
      IF OLD.category_id IS DISTINCT FROM NEW.category_id AND OLD.status = 'confirmed' THEN
        SELECT id INTO v_budget_id
        FROM budgets
        WHERE organization_id = OLD.organization_id
          AND category_id = OLD.category_id
          AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', OLD.date);
        
        IF v_budget_id IS NOT NULL THEN
          PERFORM recalculate_budget_spent(v_budget_id);
        END IF;
      END IF;
      
      -- Se data mudou, atualizar budget do mês antigo
      IF DATE_TRUNC('month', OLD.date) IS DISTINCT FROM DATE_TRUNC('month', NEW.date) 
         AND OLD.status = 'confirmed' THEN
        SELECT id INTO v_budget_id
        FROM budgets
        WHERE organization_id = OLD.organization_id
          AND category_id = OLD.category_id
          AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', OLD.date);
        
        IF v_budget_id IS NOT NULL THEN
          PERFORM recalculate_budget_spent(v_budget_id);
        END IF;
      END IF;
    END IF;
  END IF;
  
  IF NOT v_should_process THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF v_category_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Buscar budget correspondente
  SELECT id INTO v_budget_id
  FROM budgets
  WHERE organization_id = v_organization_id
    AND category_id = v_category_id
    AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', v_expense_date);
  
  IF v_budget_id IS NOT NULL THEN
    PERFORM recalculate_budget_spent(v_budget_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_update_budget_on_expense ON expenses;
CREATE TRIGGER trigger_update_budget_on_expense
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_budget_on_expense_change();

-- 2. Fazer match retroativo de category_id baseado em category (texto)
-- ============================================
-- Atualizar expenses que tem category (texto) mas não tem category_id
UPDATE expenses e
SET category_id = bc.id
FROM budget_categories bc
WHERE e.category_id IS NULL
  AND e.category IS NOT NULL
  AND LOWER(TRIM(e.category)) = LOWER(TRIM(bc.name))
  AND (e.organization_id = bc.organization_id OR bc.organization_id IS NULL);

-- 3. Adicionar índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_category_date 
ON expenses(category_id, date) 
WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_expenses_org_category_month 
ON expenses(organization_id, category_id, date) 
WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_budgets_org_category_month 
ON budgets(organization_id, category_id, month_year);

-- 4. Adicionar coluna current_spent se não existir
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budgets' 
    AND column_name = 'current_spent'
  ) THEN
    ALTER TABLE budgets ADD COLUMN current_spent DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- 5. Recalcular todos os budgets existentes
-- ============================================
DO $$
DECLARE
  v_budget RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando recalculo de todos os budgets...';
  
  FOR v_budget IN 
    SELECT id FROM budgets
  LOOP
    PERFORM recalculate_budget_spent(v_budget.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculo concluido: % budgets atualizados', v_count;
END $$;

-- 6. Comentários
-- ============================================
COMMENT ON FUNCTION recalculate_budget_spent(UUID) IS 'Recalcula o current_spent de um budget baseado nas despesas confirmadas do mês';
COMMENT ON FUNCTION update_budget_on_expense_change() IS 'Trigger function que atualiza current_spent quando expenses são modificadas';
COMMENT ON TRIGGER trigger_update_budget_on_expense ON expenses IS 'Trigger que atualiza budgets.current_spent automaticamente';

