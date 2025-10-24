-- Adicionar splits para despesas de crédito compartilhadas existentes que não têm splits
-- IDs identificados: 148, 152 (e suas parcelas futuras)

-- Buscar despesas de crédito compartilhadas sem splits
WITH credit_shared_expenses AS (
    SELECT 
        e.id,
        e.amount,
        e.organization_id,
        e.parent_expense_id,
        e.installment_info
    FROM expenses e
    WHERE 
        e.split = true 
        AND e.payment_method = 'credit_card'
        AND e.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
        AND NOT EXISTS (
            SELECT 1 FROM expense_splits es WHERE es.expense_id = e.id
        )
),
-- Buscar cost centers ativos da organização
active_cost_centers AS (
    SELECT 
        cc.id,
        cc.name,
        cc.default_split_percentage
    FROM cost_centers cc
    WHERE 
        cc.organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
        AND cc.is_active != false
)
-- Inserir splits padrão (50/50) para as despesas identificadas
INSERT INTO expense_splits (expense_id, cost_center_id, percentage, amount)
SELECT 
    cse.id,
    acc.id,
    CASE 
        WHEN acc.default_split_percentage > 0 THEN acc.default_split_percentage
        ELSE 50.0  -- Fallback para 50% se não tiver padrão
    END,
    (cse.amount * CASE 
        WHEN acc.default_split_percentage > 0 THEN acc.default_split_percentage
        ELSE 50.0
    END) / 100
FROM credit_shared_expenses cse
CROSS JOIN active_cost_centers acc
WHERE cse.id IN (148, 152); -- Apenas as despesas específicas identificadas

-- Verificar o resultado
SELECT 
    es.id,
    es.expense_id,
    cc.name as cost_center_name,
    es.percentage,
    es.amount,
    e.description,
    e.amount as total_amount
FROM expense_splits es
JOIN cost_centers cc ON cc.id = es.cost_center_id
JOIN expenses e ON e.id = es.expense_id
WHERE es.expense_id IN (148, 152)
ORDER BY es.expense_id, es.id;
