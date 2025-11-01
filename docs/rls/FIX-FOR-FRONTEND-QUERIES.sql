-- ============================================================================
-- FIX: Política compatível com queries do frontend
-- ============================================================================
-- O frontend faz queries com joins (expense_splits, cost_centers, etc)
-- A política precisa permitir esses joins
-- ============================================================================

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view all expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses - SIMPLE" ON expenses;
DROP POLICY IF EXISTS "RLS Expenses Policy" ON expenses;
DROP POLICY IF EXISTS "Simple organization check" ON expenses;

-- Garantir função helper
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
BEGIN
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    RETURN user_org_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Política ULTRA SIMPLES - apenas verifica organization_id
-- Compatível com qualquer query do frontend (incluindo joins)
CREATE POLICY "View expenses by organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

-- Fazer o mesmo para incomes
DROP POLICY IF EXISTS "Users can view incomes" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes based on org type" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;
DROP POLICY IF EXISTS "RLS Incomes Policy" ON incomes;
DROP POLICY IF EXISTS "Simple organization check incomes" ON incomes;

CREATE POLICY "View incomes by organization"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

-- Expense splits - permitir via expense pai
DROP POLICY IF EXISTS "Users can view expense splits" ON expense_splits;
DROP POLICY IF EXISTS "Users can view expense splits from their organization" ON expense_splits;
DROP POLICY IF EXISTS "RLS Expense Splits Policy" ON expense_splits;

CREATE POLICY "View expense splits by organization"
ON expense_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND expenses.organization_id = get_user_organization_id()
  )
);

-- Income splits
DROP POLICY IF EXISTS "Users can view income splits" ON income_splits;
DROP POLICY IF EXISTS "Users can view income splits from their organization" ON income_splits;
DROP POLICY IF EXISTS "RLS Income Splits Policy" ON income_splits;

CREATE POLICY "View income splits by organization"
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND incomes.organization_id = get_user_organization_id()
  )
);

-- Cost centers - permitir ver todos da organização
DROP POLICY IF EXISTS "Users can view cost centers from their organization" ON cost_centers;
DROP POLICY IF EXISTS "Users can view cost centers" ON cost_centers;

CREATE POLICY "View cost centers by organization"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

-- Budget categories - permitir ver todos da organização + globais
DROP POLICY IF EXISTS "Users can view categories from their organization or global" ON budget_categories;
DROP POLICY IF EXISTS "Users can insert categories in their organization" ON budget_categories;

CREATE POLICY "View budget categories"
ON budget_categories
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() OR
  organization_id IS NULL
);

-- Garantir RLS habilitado
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Teste: simular query do frontend (com join)
SELECT 
  'Teste: Query tipo frontend' as info,
  COUNT(*) as total_expenses
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- Teste com join (como frontend faz)
SELECT 
  'Teste: Query com expense_splits (join)' as info,
  COUNT(DISTINCT expenses.id) as expenses_com_splits
FROM expenses
LEFT JOIN expense_splits ON expense_splits.expense_id = expenses.id
WHERE expenses.organization_id = get_user_organization_id();

SELECT '✅ Políticas aplicadas - RLS mostra todas da organização' as resultado;

