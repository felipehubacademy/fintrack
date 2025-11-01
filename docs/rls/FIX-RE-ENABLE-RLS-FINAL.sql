-- ============================================================================
-- REABILITAR RLS COM POLÍTICAS CORRETAS
-- ============================================================================

-- Reabilitar RLS em todas as tabelas
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas SELECT existentes
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

-- POLÍTICAS SIMPLES: Apenas verifica organization_id
-- ============================================================================

-- Expenses: Usuário vê todas as expenses da sua organização
CREATE POLICY "expenses_select_org"
ON expenses FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

-- Incomes: Mesma lógica
CREATE POLICY "incomes_select_org"
ON incomes FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

-- Expense splits: Via expense (se expense é acessível, splits são acessíveis)
CREATE POLICY "expense_splits_select"
ON expense_splits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN users u ON u.organization_id = e.organization_id
    WHERE e.id = expense_splits.expense_id
    AND u.id = auth.uid()
    AND u.is_active = true
  )
);

-- Income splits: Via income
CREATE POLICY "income_splits_select"
ON income_splits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes i
    JOIN users u ON u.organization_id = i.organization_id
    WHERE i.id = income_splits.income_id
    AND u.id = auth.uid()
    AND u.is_active = true
  )
);

-- Cost centers: Todos da organização (necessário para joins)
CREATE POLICY "cost_centers_select"
ON cost_centers FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

-- Budget categories: Da organização OU globais (organization_id IS NULL)
CREATE POLICY "budget_categories_select"
ON budget_categories FOR SELECT TO authenticated
USING (
  organization_id IS NULL OR
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

-- Verificar políticas criadas
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('expenses', 'incomes', 'expense_splits', 'income_splits', 'cost_centers', 'budget_categories')
AND cmd = 'SELECT'
ORDER BY tablename;

SELECT '✅ RLS reabilitado com políticas corretas' as resultado;

