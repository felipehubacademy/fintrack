-- ============================================================================
-- FIX ABSOLUTAMENTE SIMPLES: Política mínima que DEVE funcionar
-- ============================================================================

-- Remover TODAS as políticas SELECT de uma vez
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('expenses', 'incomes', 'expense_splits', 'income_splits', 'cost_centers', 'budget_categories')
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Política MÍNIMA para expenses - apenas verifica organization_id
CREATE POLICY "expenses_org_check"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Política MÍNIMA para incomes
CREATE POLICY "incomes_org_check"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Expense splits
CREATE POLICY "expense_splits_org_check"
ON expense_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND expenses.organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  )
);

-- Income splits
CREATE POLICY "income_splits_org_check"
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND incomes.organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  )
);

-- Cost centers
CREATE POLICY "cost_centers_org_check"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Budget categories
CREATE POLICY "budget_categories_check"
ON budget_categories
FOR SELECT
TO authenticated
USING (
  organization_id IS NULL OR
  organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Garantir RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

SELECT '✅ Políticas mínimas aplicadas - Limpe cache do browser e recarregue' as resultado;

