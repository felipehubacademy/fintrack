-- ============================================
-- INVESTIGAÇÃO: Procurar triggers e rules que podem estar duplicando inserções
-- ============================================

-- 1. Verificar TODOS os triggers na tabela expense_splits
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS enabled,
    t.tgtype AS trigger_type,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'expense_splits'
AND n.nspname = 'public'
AND NOT t.tgisinternal;

-- 2. Verificar RULES na tabela expense_splits
SELECT 
    r.rulename AS rule_name,
    pg_get_ruledef(r.oid) AS rule_definition
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'expense_splits'
AND n.nspname = 'public'
AND r.rulename != '_RETURN';

-- 3. Verificar TODOS os triggers na tabela expenses
SELECT 
    t.tgname AS trigger_name,
    t.tgenabled AS enabled,
    t.tgtype AS trigger_type,
    pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'expenses'
AND n.nspname = 'public'
AND NOT t.tgisinternal;

-- 4. Verificar se há políticas RLS que podem estar causando duplicação
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('expense_splits', 'expenses')
ORDER BY tablename, policyname;

-- 5. Verificar constraints na tabela expense_splits
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class c ON con.conrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'expense_splits'
AND n.nspname = 'public';

