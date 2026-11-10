-- Desabilitar RLS temporariamente para debug
-- =============================================

-- 1. Desabilitar RLS na tabela expenses
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se RLS foi desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'expenses';

-- 3. Mostrar quantas expenses existem
SELECT COUNT(*) as total_expenses FROM expenses;

-- 4. Mostrar algumas expenses de exemplo
SELECT 
    id,
    amount,
    description,
    owner,
    payment_method,
    source,
    status,
    organization_id,
    created_at
FROM expenses 
ORDER BY created_at DESC 
LIMIT 5;
