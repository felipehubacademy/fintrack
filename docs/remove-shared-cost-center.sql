-- ============================================
-- REMOVER COST CENTER "COMPARTILHADO"
-- Nova Lógica: Compartilhado não é um cost_center, é um flag
-- ============================================

-- 1. Verificar cost_center "Compartilhado" atual
SELECT 
    id,
    name,
    type,
    organization_id
FROM cost_centers 
WHERE name = 'Compartilhado' 
  AND type = 'shared'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- 2. Atualizar despesas antigas que apontavam para "Compartilhado"
UPDATE expenses 
SET cost_center_id = NULL
WHERE owner = 'Compartilhado'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- Verificar quantas foram atualizadas
SELECT COUNT(*) as despesas_atualizadas
FROM expenses
WHERE owner = 'Compartilhado'
  AND cost_center_id IS NULL
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- 3. Remover o cost_center "Compartilhado"
DELETE FROM cost_centers 
WHERE name = 'Compartilhado' 
  AND type = 'shared'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- 4. Verificar cost_centers restantes
SELECT 
    name,
    type,
    split_percentage,
    color,
    is_active
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
ORDER BY name;

-- Resultado esperado: Apenas Felipe e Letícia

-- 5. Verificar despesas compartilhadas
SELECT 
    id,
    description,
    amount,
    owner,
    split,
    cost_center_id
FROM expenses
WHERE owner = 'Compartilhado'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
ORDER BY created_at DESC
LIMIT 5;

-- Resultado esperado: cost_center_id = NULL para todas

-- ============================================
-- TESTE FINAL
-- ============================================
SELECT 
    'Cost Centers Individuais' as check_item,
    COUNT(*) as count
FROM cost_centers 
WHERE type = 'individual'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
UNION ALL
SELECT 
    'Cost Centers Compartilhados' as check_item,
    COUNT(*) as count
FROM cost_centers 
WHERE type = 'shared'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9';

-- Resultado esperado:
-- Cost Centers Individuais: 2 (Felipe e Letícia)
-- Cost Centers Compartilhados: 0

