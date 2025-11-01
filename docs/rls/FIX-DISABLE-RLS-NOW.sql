-- ============================================================================
-- DESABILITAR RLS AGORA - Testar se expenses aparecem
-- ============================================================================

ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;

-- Agora RECARREGUE O DASHBOARD e me diga: apareceram as expenses?

