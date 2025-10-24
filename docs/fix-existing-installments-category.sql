-- Corrigir parcelas futuras existentes que não têm categoria
-- Atualizar o campo 'category' nas parcelas pending que têm category_id mas não têm category

UPDATE expenses 
SET category = (
    SELECT bc.name 
    FROM budget_categories bc 
    WHERE bc.id = expenses.category_id
)
WHERE 
    status = 'pending' 
    AND category_id IS NOT NULL 
    AND category IS NULL
    AND parent_expense_id IS NOT NULL;

-- Verificar o resultado
SELECT 
    id, 
    description, 
    category_id, 
    category, 
    status, 
    parent_expense_id,
    (installment_info->>'current_installment')::text AS current_installment
FROM expenses 
WHERE 
    parent_expense_id IS NOT NULL 
    AND status = 'pending'
ORDER BY parent_expense_id, (installment_info->>'current_installment')::int;
