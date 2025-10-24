-- ============================================
-- CORRIGIR current_spent DOS ORÇAMENTOS
-- ============================================
-- Este script cria um trigger que atualiza automaticamente
-- o campo current_spent na tabela budgets quando despesas são
-- criadas, atualizadas ou deletadas

-- 1. Função para atualizar current_spent de um orçamento específico
CREATE OR REPLACE FUNCTION update_budget_current_spent()
RETURNS TRIGGER AS $$
DECLARE
    budget_record RECORD;
    total_spent DECIMAL(10,2) := 0;
    expense_date DATE;
    expense_month_year DATE;
    budget_month_year DATE;
BEGIN
    -- Determinar a data da despesa (INSERT/UPDATE) ou usar a data da despesa deletada
    IF TG_OP = 'DELETE' THEN
        expense_date := OLD.date;
    ELSE
        expense_date := NEW.date;
    END IF;
    
    -- Calcular o primeiro dia do mês da despesa
    expense_month_year := DATE_TRUNC('month', expense_date)::DATE;
    
    -- Buscar todos os orçamentos que podem ser afetados
    FOR budget_record IN 
        SELECT DISTINCT b.id, b.organization_id, b.category_id, b.month_year
        FROM budgets b
        WHERE b.organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
        AND b.category_id = COALESCE(NEW.category_id, OLD.category_id)
        AND b.month_year = expense_month_year
    LOOP
        -- Calcular total gasto para este orçamento no mês
        SELECT COALESCE(SUM(amount), 0) INTO total_spent
        FROM expenses
        WHERE organization_id = budget_record.organization_id
        AND category_id = budget_record.category_id
        AND status = 'confirmed'
        AND DATE_TRUNC('month', date)::DATE = budget_record.month_year;
        
        -- Atualizar current_spent do orçamento
        UPDATE budgets 
        SET 
            current_spent = total_spent,
            updated_at = NOW()
        WHERE id = budget_record.id;
        
        RAISE NOTICE 'Orçamento % atualizado: current_spent = %', budget_record.id, total_spent;
    END LOOP;
    
    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger para INSERT/UPDATE/DELETE de despesas
DROP TRIGGER IF EXISTS trigger_update_budget_spent ON expenses;

CREATE TRIGGER trigger_update_budget_spent
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_current_spent();

-- 3. Atualizar current_spent de todos os orçamentos existentes
UPDATE budgets 
SET current_spent = (
    SELECT COALESCE(SUM(e.amount), 0)
    FROM expenses e
    WHERE e.organization_id = budgets.organization_id
    AND e.category_id = budgets.category_id
    AND e.status = 'confirmed'
    AND DATE_TRUNC('month', e.date)::DATE = budgets.month_year
),
updated_at = NOW();

-- 4. Verificar os resultados
SELECT 
    b.id,
    b.organization_id,
    b.category_id,
    b.month_year,
    b.limit_amount,
    b.current_spent,
    ROUND((b.current_spent / NULLIF(b.limit_amount, 0)) * 100, 2) as usage_percentage
FROM budgets b
ORDER BY b.organization_id, b.month_year, b.category_id;

-- 5. Teste: Verificar se o trigger funciona
-- (Execute este teste manualmente após criar uma despesa)
/*
SELECT 
    'Teste do Trigger' as status,
    COUNT(*) as total_budgets,
    SUM(current_spent) as total_current_spent
FROM budgets 
WHERE current_spent > 0;
*/
