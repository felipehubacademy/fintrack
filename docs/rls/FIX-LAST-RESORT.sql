-- ============================================================================
-- FIX ÚLTIMO RECURSO: Remove TUDO e cria política que FUNCIONA
-- ============================================================================

-- PASSO 1: Remover TODAS as políticas SELECT de expenses
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'expenses'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON expenses', policy_name);
  END LOOP;
END $$;

-- PASSO 2: Criar política ULTRA SIMPLES usando apenas auth.uid()
-- Sem funções helper, sem subqueries complexas
CREATE POLICY "Allow expenses from user org"
ON expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = auth.uid()
    AND users.organization_id = expenses.organization_id
    AND users.is_active = true
  )
);

-- PASSO 3: Fazer o mesmo para incomes
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'incomes'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON incomes', policy_name);
  END LOOP;
END $$;

CREATE POLICY "Allow incomes from user org"
ON incomes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = auth.uid()
    AND users.organization_id = incomes.organization_id
    AND users.is_active = true
  )
);

-- PASSO 4: Expense splits e Income splits
DROP POLICY IF EXISTS "View expense splits by organization" ON expense_splits;
DROP POLICY IF EXISTS "Users can view expense splits" ON expense_splits;
DROP POLICY IF EXISTS "RLS Expense Splits Policy" ON expense_splits;

CREATE POLICY "Allow expense splits from user org"
ON expense_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM expenses 
    JOIN users ON users.organization_id = expenses.organization_id
    WHERE expenses.id = expense_splits.expense_id
    AND users.id = auth.uid()
    AND users.is_active = true
  )
);

DROP POLICY IF EXISTS "View income splits by organization" ON income_splits;
DROP POLICY IF EXISTS "Users can view income splits" ON income_splits;
DROP POLICY IF EXISTS "RLS Income Splits Policy" ON income_splits;

CREATE POLICY "Allow income splits from user org"
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM incomes 
    JOIN users ON users.organization_id = incomes.organization_id
    WHERE incomes.id = income_splits.income_id
    AND users.id = auth.uid()
    AND users.is_active = true
  )
);

-- PASSO 5: Cost centers e Budget categories
DROP POLICY IF EXISTS "View cost centers by organization" ON cost_centers;
DROP POLICY IF EXISTS "Users can view cost centers" ON cost_centers;

CREATE POLICY "Allow cost centers from user org"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = auth.uid()
    AND users.organization_id = cost_centers.organization_id
    AND users.is_active = true
  )
);

DROP POLICY IF EXISTS "View budget categories" ON budget_categories;

CREATE POLICY "Allow budget categories from user org or global"
ON budget_categories
FOR SELECT
TO authenticated
USING (
  budget_categories.organization_id IS NULL OR
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE users.id = auth.uid()
    AND users.organization_id = budget_categories.organization_id
    AND users.is_active = true
  )
);

-- Garantir RLS habilitado
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Verificar se funciona
SELECT 
  'Teste final' as info,
  COUNT(*)::text as expenses_count
FROM expenses;

SELECT '✅ Política aplicada usando EXISTS direto - Recarregue dashboard AGORA' as resultado;

