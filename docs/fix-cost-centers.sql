-- ============================================
-- CORRIGIR E RECRIAR COST CENTERS
-- ============================================

-- 1. Verificar o que aconteceu
SELECT 
    id,
    name,
    type,
    split_percentage,
    organization_id
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- 2. Se estiver vazio, recriar Felipe e Letícia
-- Nota: Ajuste os IDs se você souber os originais, ou use novos UUIDs

-- 2.1. Verificar se já existem (pode ser que só o type esteja NULL)
SELECT COUNT(*) as total_cost_centers
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- 2.2. Se COUNT = 0, recriar:
INSERT INTO cost_centers (organization_id, name, type, split_percentage, color, is_active)
VALUES 
    ('092adfb3-41d8-4006-bfa5-7035358560e9', 'Felipe', 'individual', 50.00, '#3B82F6', true),
    ('092adfb3-41d8-4006-bfa5-7035358560e9', 'Letícia', 'individual', 50.00, '#EC4899', true)
ON CONFLICT DO NOTHING;

-- 3. Verificar se foram criados
SELECT 
    id,
    name,
    type,
    split_percentage,
    color
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
ORDER BY name;

-- Resultado esperado:
-- Felipe  | individual | 50.00 | #3B82F6
-- Letícia | individual | 50.00 | #EC4899

-- 4. Atualizar despesas que perderam cost_center_id
-- (exceto as compartilhadas que devem ficar NULL)

-- 4.1. Ver despesas sem cost_center_id
SELECT 
    id,
    description,
    owner,
    split,
    cost_center_id
FROM expenses
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
  AND cost_center_id IS NULL
ORDER BY owner, created_at DESC;

-- 4.2. Atualizar despesas do Felipe
UPDATE expenses 
SET cost_center_id = (
    SELECT id FROM cost_centers 
    WHERE name = 'Felipe' 
      AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
    LIMIT 1
)
WHERE owner = 'Felipe' 
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
  AND cost_center_id IS NULL
  AND split = false; -- Apenas despesas NÃO compartilhadas

-- 4.3. Atualizar despesas da Letícia
UPDATE expenses 
SET cost_center_id = (
    SELECT id FROM cost_centers 
    WHERE name = 'Letícia' 
      AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
    LIMIT 1
)
WHERE owner = 'Letícia' 
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
  AND cost_center_id IS NULL
  AND split = false; -- Apenas despesas NÃO compartilhadas

-- 5. Verificação Final
SELECT 
    owner,
    split,
    CASE 
        WHEN cost_center_id IS NULL THEN 'NULL'
        ELSE 'SET'
    END as cost_center_status,
    COUNT(*) as total
FROM expenses
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
GROUP BY owner, split, CASE WHEN cost_center_id IS NULL THEN 'NULL' ELSE 'SET' END
ORDER BY owner, split;

-- Resultado esperado:
-- Felipe        | false | SET  | X  ← Despesas individuais do Felipe
-- Letícia       | false | SET  | X  ← Despesas individuais da Letícia
-- Compartilhado | true  | NULL | X  ← Despesas compartilhadas (correto)

-- 6. Teste Final
SELECT 
    'Cost Centers OK' as status,
    COUNT(*) as count
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
  AND type = 'individual'
HAVING COUNT(*) = 2;

-- Resultado esperado: 1 linha com count = 2

