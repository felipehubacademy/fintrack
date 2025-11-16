-- Verificar splits da expense_id 749
SELECT 
    es.id,
    es.expense_id,
    es.cost_center_id,
    cc.name as cost_center_name,
    es.percentage,
    es.amount
FROM expense_splits es
LEFT JOIN cost_centers cc ON es.cost_center_id = cc.id
WHERE es.expense_id = 749
ORDER BY es.cost_center_id;

-- Verificar a expense
SELECT 
    id,
    amount,
    description,
    owner,
    is_shared,
    cost_center_id,
    installment_info
FROM expenses
WHERE id = 749;

