-- ============================================================================
-- FIX EMERGENCY: Desabilitar RLS temporariamente para debug
-- Execute este script se precisar desabilitar RLS rapidamente para investigar
-- ============================================================================
-- ⚠️ ATENÇÃO: Isso remove TODA a proteção RLS. Use apenas para debug!
-- ============================================================================

-- Desabilitar RLS nas tabelas principais (as que estão causando problemas)
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'expenses', 'expense_splits', 'incomes', 'income_splits',
  'budgets', 'budget_categories', 'cost_centers', 'cards', 'bills'
)
ORDER BY tablename;

RAISE NOTICE '⚠️  RLS DESABILITADO temporariamente nas tabelas financeiras principais';
RAISE NOTICE 'Execute FIX-helper-functions.sql e FIX-users-policy.sql, depois reabilite RLS';

