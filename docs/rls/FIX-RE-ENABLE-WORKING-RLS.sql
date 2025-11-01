-- ============================================================================
-- REABILITAR RLS COM POLÍTICA QUE FUNCIONA
-- ============================================================================
-- Execute este DEPOIS de confirmar que expenses aparecem sem RLS
-- ============================================================================

-- Reabilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas
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

-- Política ULTRA SIMPLES: apenas verifica se organization_id bate com o usuário
CREATE POLICY "expenses_org"
ON expenses FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

CREATE POLICY "incomes_org"
ON incomes FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

CREATE POLICY "expense_splits_org"
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

CREATE POLICY "income_splits_org"
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

CREATE POLICY "cost_centers_org"
ON cost_centers FOR SELECT TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

CREATE POLICY "budget_categories_org"
ON budget_categories FOR SELECT TO authenticated
USING (
  organization_id IS NULL OR
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true LIMIT 1)
);

