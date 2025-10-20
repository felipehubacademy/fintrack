-- ============================================
-- DESABILITAR RLS TEMPORARIAMENTE - expense_splits
-- APENAS PARA TESTES
-- ============================================

-- Desabilitar RLS
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;

-- Verificar se foi desabilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'expense_splits';

-- Resultado esperado: rls_enabled = false

-- ============================================
-- PARA REABILITAR DEPOIS DOS TESTES:
-- ============================================
-- ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

