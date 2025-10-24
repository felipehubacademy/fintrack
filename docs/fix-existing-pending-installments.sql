-- Corrigir parcelas futuras existentes que estão como 'pending'
-- Elas devem ser 'confirmed' e consumir o crédito do cartão imediatamente

-- Atualizar todas as parcelas futuras (pending) para confirmed
UPDATE expenses 
SET 
    status = 'confirmed',
    confirmed_at = NOW(),
    confirmed_by = user_id
WHERE 
    status = 'pending' 
    AND parent_expense_id IS NOT NULL
    AND payment_method = 'credit_card';

-- Verificar o resultado
SELECT 
    id, 
    description, 
    amount,
    date,
    status,
    confirmed_at,
    confirmed_by,
    parent_expense_id,
    (installment_info->>'current_installment')::text AS current_installment,
    (installment_info->>'total_installments')::text AS total_installments
FROM expenses 
WHERE 
    parent_expense_id IS NOT NULL 
    AND payment_method = 'credit_card'
ORDER BY parent_expense_id, (installment_info->>'current_installment')::int;
