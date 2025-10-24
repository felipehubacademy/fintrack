-- ============================================
-- ADICIONAR CONSTRAINT UNIQUE PARA ORÇAMENTOS
-- ============================================
-- Limita 1 orçamento por categoria por mês por organização

-- 1. Verificar se já existe constraint similar
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'budgets' 
    AND tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public';

-- 2. Remover constraint existente se houver (pode ter nome diferente)
DO $$ 
BEGIN
    -- Tentar remover constraint existente
    BEGIN
        ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_organization_id_cost_center_id_category_id_month_ye_key;
    EXCEPTION
        WHEN OTHERS THEN
            -- Se não existir, continuar
            NULL;
    END;
    
    -- Tentar remover outros possíveis nomes
    BEGIN
        ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_unique_category_month;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;
END $$;

-- 3. Adicionar nova constraint mais restritiva
-- Apenas 1 orçamento por categoria por mês (sem cost_center_id)
ALTER TABLE budgets 
ADD CONSTRAINT budgets_unique_category_month 
UNIQUE (organization_id, category_id, month_year);

-- 4. Verificar se a constraint foi criada
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'budgets' 
    AND tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- 5. Teste: Tentar inserir orçamento duplicado (deve falhar)
-- (Descomente para testar)
/*
INSERT INTO budgets (organization_id, category_id, month_year, limit_amount)
VALUES (
    '092adfb3-41d8-4006-bfa5-7035338560e9',
    '0311ecc8-3807-4452-8e21-1f4a0dbfab62', -- Categoria existente
    '2025-10-01',
    1000.00
);
-- Deve retornar erro: duplicate key value violates unique constraint
*/
