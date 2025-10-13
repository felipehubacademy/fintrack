-- Desabilitar RLS temporariamente em expenses_general para testes
ALTER TABLE expenses_general DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('expenses', 'expenses_general');

