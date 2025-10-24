-- ============================================
-- TESTE DO TRIGGER DE current_spent
-- ============================================
-- Este script testa se o trigger está funcionando corretamente

-- 1. Verificar estado atual dos orçamentos
SELECT 
    'Estado Inicial' as status,
    b.id,
    b.organization_id,
    b.category_id,
    b.month_year,
    b.limit_amount,
    b.current_spent,
    ROUND((b.current_spent / NULLIF(b.limit_amount, 0)) * 100, 2) as usage_percentage
FROM budgets b
WHERE b.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
ORDER BY b.month_year, b.category_id;

-- 2. Verificar despesas existentes para o mês atual
SELECT 
    'Despesas do Mês' as status,
    e.id,
    e.description,
    e.amount,
    e.date,
    e.category_id,
    bc.name as category_name,
    DATE_TRUNC('month', e.date)::DATE as month_year
FROM expenses e
LEFT JOIN budget_categories bc ON bc.id = e.category_id
WHERE e.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
AND e.status = 'confirmed'
AND DATE_TRUNC('month', e.date)::DATE = '2025-10-01'::DATE
ORDER BY e.date DESC;

-- 3. Calcular manualmente o que deveria ser o current_spent
SELECT 
    'Cálculo Manual' as status,
    b.id as budget_id,
    b.category_id,
    b.limit_amount,
    COALESCE(SUM(e.amount), 0) as calculated_spent,
    b.current_spent as stored_spent,
    CASE 
        WHEN COALESCE(SUM(e.amount), 0) = b.current_spent THEN '✅ CORRETO'
        ELSE '❌ INCORRETO'
    END as status_check
FROM budgets b
LEFT JOIN expenses e ON e.organization_id = b.organization_id
    AND e.category_id = b.category_id
    AND e.status = 'confirmed'
    AND DATE_TRUNC('month', e.date)::DATE = b.month_year
WHERE b.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
GROUP BY b.id, b.category_id, b.limit_amount, b.current_spent
ORDER BY b.month_year, b.category_id;

-- 4. Teste: Criar uma despesa de teste para verificar se o trigger funciona
-- (Descomente as linhas abaixo para testar)
/*
INSERT INTO expenses (
    organization_id,
    user_id,
    amount,
    description,
    date,
    payment_method,
    category_id,
    status,
    confirmed_at,
    confirmed_by,
    source
) VALUES (
    '092adfb3-41d8-4006-bfa5-7035338560e9',
    (SELECT id FROM users WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9' LIMIT 1),
    50.00,
    'Teste do Trigger - Despesa de Teste',
    '2025-10-15',
    'cash',
    (SELECT id FROM budget_categories WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9' LIMIT 1),
    'confirmed',
    NOW(),
    (SELECT id FROM users WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9' LIMIT 1),
    'manual'
);

-- Verificar se o current_spent foi atualizado
SELECT 
    'Após Inserção' as status,
    b.id,
    b.category_id,
    b.limit_amount,
    b.current_spent,
    ROUND((b.current_spent / NULLIF(b.limit_amount, 0)) * 100, 2) as usage_percentage
FROM budgets b
WHERE b.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
AND b.category_id = (SELECT id FROM budget_categories WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9' LIMIT 1);

-- Limpar despesa de teste
DELETE FROM expenses 
WHERE description = 'Teste do Trigger - Despesa de Teste'
AND organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9';
*/
