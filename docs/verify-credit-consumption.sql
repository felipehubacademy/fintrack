-- Verificar se as parcelas futuras estão consumindo o crédito do cartão corretamente
-- Mostrar todas as despesas parceladas e seus valores

SELECT 
    e.id,
    e.description,
    e.amount,
    e.date,
    e.status,
    e.payment_method,
    e.card_id,
    c.name as card_name,
    c.credit_limit,
    e.parent_expense_id,
    (e.installment_info->>'current_installment')::text AS current_installment,
    (e.installment_info->>'total_installments')::text AS total_installments,
    (e.installment_info->>'total_amount')::text AS total_amount,
    e.created_at,
    e.confirmed_at
FROM expenses e
LEFT JOIN cards c ON c.id = e.card_id
WHERE 
    e.payment_method = 'credit_card'
    AND e.installment_info IS NOT NULL
    AND e.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
ORDER BY 
    COALESCE(e.parent_expense_id, e.id), 
    (e.installment_info->>'current_installment')::int;

-- Verificar se há parcelas pending que precisam ser corrigidas
SELECT 
    COUNT(*) as pending_installments,
    SUM(amount) as total_pending_amount
FROM expenses 
WHERE 
    status = 'pending' 
    AND parent_expense_id IS NOT NULL
    AND payment_method = 'credit_card';
