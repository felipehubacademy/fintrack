-- ============================================================================
-- Migration: Fix budgets current_spent calculation
-- Data: 31/10/2025
-- Descrição: Adiciona coluna current_spent na tabela budgets e cria trigger
--            para atualizar automaticamente quando despesas são criadas/atualizadas/deletadas
-- ============================================================================

-- 1. Adicionar coluna current_spent se não existir
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

-- 2. Criar função para recalcular current_spent de um budget
-- ============================================
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

-- 3. Criar função trigger para atualizar budget após mudanças em expenses
-- ============================================
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
    -- Para DELETE: processar se estava confirmada
    IF OLD.status = 'confirmed' THEN
      v_category_id := OLD.category_id;
      v_organization_id := OLD.organization_id;
      v_expense_date := OLD.date;
      v_should_process := true;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Para INSERT: processar se está confirmada
    IF NEW.status = 'confirmed' THEN
      v_category_id := NEW.category_id;
      v_organization_id := NEW.organization_id;
      v_expense_date := NEW.date;
      v_should_process := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Para UPDATE: processar se estava confirmada ou está confirmada agora
    IF OLD.status = 'confirmed' OR NEW.status = 'confirmed' THEN
      -- Usar NEW (valores atuais), mas também considerar OLD se necessário
      v_category_id := NEW.category_id;
      v_organization_id := NEW.organization_id;
      v_expense_date := NEW.date;
      v_should_process := true;
      
      -- Se categoria mudou, atualizar ambos os budgets (antigo e novo)
      IF OLD.category_id IS DISTINCT FROM NEW.category_id AND OLD.status = 'confirmed' THEN
        -- Buscar budget antigo
        SELECT id INTO v_budget_id
        FROM budgets
        WHERE organization_id = OLD.organization_id
          AND category_id = OLD.category_id
          AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', OLD.date);
        
        IF v_budget_id IS NOT NULL THEN
          PERFORM recalculate_budget_spent(v_budget_id);
        END IF;
      END IF;
      
      -- Se data mudou e estava confirmada, atualizar budget do mês antigo também
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
  
  -- Se não deve processar, retornar
  IF NOT v_should_process THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Se não tem category_id, não há o que atualizar
  IF v_category_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Buscar budget correspondente (mesmo mês/ano)
  SELECT id INTO v_budget_id
  FROM budgets
  WHERE organization_id = v_organization_id
    AND category_id = v_category_id
    AND DATE_TRUNC('month', month_year) = DATE_TRUNC('month', v_expense_date);
  
  -- Se encontrou budget, recalcular
  IF v_budget_id IS NOT NULL THEN
    PERFORM recalculate_budget_spent(v_budget_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger na tabela expenses
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_budget_on_expense ON expenses;
CREATE TRIGGER trigger_update_budget_on_expense
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_budget_on_expense_change();

-- 5. Recalcular todos os budgets existentes (sincronização inicial)
-- ============================================
DO $$
DECLARE
  v_budget RECORD;
BEGIN
  FOR v_budget IN 
    SELECT id FROM budgets
  LOOP
    PERFORM recalculate_budget_spent(v_budget.id);
  END LOOP;
END $$;

-- 6. Comentários
-- ============================================
COMMENT ON FUNCTION recalculate_budget_spent(UUID) IS 'Recalcula o current_spent de um budget baseado nas despesas confirmadas do mês';
COMMENT ON FUNCTION update_budget_on_expense_change() IS 'Trigger function que atualiza current_spent quando expenses são modificadas';
COMMENT ON TRIGGER trigger_update_budget_on_expense ON expenses IS 'Trigger que atualiza budgets.current_spent automaticamente quando expenses são inseridas/atualizadas/deletadas';

