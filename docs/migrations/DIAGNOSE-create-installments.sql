-- ============================================
-- DIAGNÓSTICO: Verificar versão da função create_installments
-- ============================================
-- Execute este script no SQL Editor do Supabase para verificar
-- se a função foi atualizada corretamente

-- 1. Verificar se a função existe
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

-- 2. Verificar o comentário da função (deve mencionar HOTFIX se foi atualizada)
SELECT 
    p.proname AS function_name,
    d.description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_description d ON d.objoid = p.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

-- 3. Verificar quantas versões da função existem (sobrecarga)
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

