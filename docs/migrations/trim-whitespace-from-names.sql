-- ============================================
-- REMOVER ESPAÇOS EXTRAS (TRIM) DE NOMES
-- ============================================
-- 
-- Esta migração remove espaços no início e fim de campos de nome
-- em todas as tabelas relevantes para manter consistência.
--
-- Data: 2025-11-05
-- ============================================

-- 1. Limpar espaços em incomes.owner
UPDATE incomes 
SET owner = TRIM(owner)
WHERE owner IS NOT NULL AND owner != TRIM(owner);

-- 2. Limpar espaços em expenses.owner
UPDATE expenses 
SET owner = TRIM(owner)
WHERE owner IS NOT NULL AND owner != TRIM(owner);

-- 3. Limpar espaços em cost_centers.name
UPDATE cost_centers 
SET name = TRIM(name)
WHERE name IS NOT NULL AND name != TRIM(name);

-- 4. Limpar espaços em organizations.name
UPDATE organizations 
SET name = TRIM(name)
WHERE name IS NOT NULL AND name != TRIM(name);

-- 5. Limpar espaços em users.name
UPDATE users 
SET name = TRIM(name)
WHERE name IS NOT NULL AND name != TRIM(name);

-- 6. Limpar espaços em bills.description (se aplicável)
UPDATE bills 
SET description = TRIM(description)
WHERE description IS NOT NULL AND description != TRIM(description);

-- 7. Limpar espaços em expenses.description (se aplicável)
UPDATE expenses 
SET description = TRIM(description)
WHERE description IS NOT NULL AND description != TRIM(description);

-- 8. Limpar espaços em incomes.description (se aplicável)
UPDATE incomes 
SET description = TRIM(description)
WHERE description IS NOT NULL AND description != TRIM(description);

-- 9. Verificar quantos registros foram atualizados
SELECT 
    'incomes.owner' as campo,
    COUNT(*) as registros_limpos
FROM incomes 
WHERE owner IS NOT NULL AND owner != TRIM(owner)
UNION ALL
SELECT 
    'expenses.owner' as campo,
    COUNT(*) as registros_limpos
FROM expenses 
WHERE owner IS NOT NULL AND owner != TRIM(owner)
UNION ALL
SELECT 
    'cost_centers.name' as campo,
    COUNT(*) as registros_limpos
FROM cost_centers 
WHERE name IS NOT NULL AND name != TRIM(name)
UNION ALL
SELECT 
    'organizations.name' as campo,
    COUNT(*) as registros_limpos
FROM organizations 
WHERE name IS NOT NULL AND name != TRIM(name)
UNION ALL
SELECT 
    'users.name' as campo,
    COUNT(*) as registros_limpos
FROM users 
WHERE name IS NOT NULL AND name != TRIM(name);

