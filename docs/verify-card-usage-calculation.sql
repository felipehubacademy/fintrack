-- Verificar cálculo de uso dos cartões incluindo parcelas futuras
-- Mostrar todas as despesas confirmadas por cartão

SELECT 
    c.id as card_id,
    c.name as card_name,
    c.credit_limit,
    COUNT(e.id) as total_expenses,
    SUM(e.amount) as total_used,
    ROUND((SUM(e.amount) / c.credit_limit) * 100, 2) as usage_percentage
FROM cards c
LEFT JOIN expenses e ON (
    e.card_id = c.id 
    AND e.payment_method = 'credit_card' 
    AND e.status = 'confirmed'
)
WHERE c.type = 'credit' 
    AND c.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
GROUP BY c.id, c.name, c.credit_limit
ORDER BY c.name;

-- Detalhar despesas por cartão para verificar
SELECT 
    c.name as card_name,
    e.id as expense_id,
    e.description,
    e.amount,
    e.date,
    e.status,
    (e.installment_info->>'current_installment')::text AS current_installment,
    (e.installment_info->>'total_installments')::text AS total_installments
FROM cards c
JOIN expenses e ON e.card_id = c.id
WHERE c.type = 'credit' 
    AND c.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
    AND e.payment_method = 'credit_card' 
    AND e.status = 'confirmed'
ORDER BY c.name, e.date, (e.installment_info->>'current_installment')::int;
