-- Corrigir as duas despesas de crédito que estão como pending
-- IDs: 131 e 132 (açougue R$150 em 1x)

UPDATE expenses 
SET 
    status = 'confirmed',
    confirmed_at = created_at,
    confirmed_by = user_id
WHERE 
    id IN (131, 132)
    AND payment_method = 'credit_card'
    AND status = 'pending'
    AND (installment_info->>'total_installments')::int = 1;

-- Verificar resultado
SELECT 
    id,
    description,
    amount,
    status,
    payment_method,
    installment_info->>'total_installments' as installments,
    confirmed_at
FROM expenses
WHERE id IN (131, 132);

