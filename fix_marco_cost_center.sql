-- ============================================================================
-- CORREÇÃO: Criar centro de custo para o Marco
-- ============================================================================

-- IMPORTANTE: Execute este script SOMENTE após confirmar que o Marco não tem cost_center

-- 1. Criar cost_center para o Marco
INSERT INTO cost_centers (
  organization_id,
  name,
  user_id,
  linked_email,
  default_split_percentage,
  color,
  is_active
)
SELECT 
  u.organization_id,
  u.name,
  u.id,
  u.email,
  50.00, -- Percentual padrão
  '#3B82F6', -- Azul padrão
  true
FROM users u
WHERE u.email = 'marco.salles@manzini.cc'
  AND u.id = '58682b6b-0f9a-4ef7-a3db-beaaa42e13f2'
  AND NOT EXISTS (
    -- Só criar se não existir
    SELECT 1 FROM cost_centers cc
    WHERE cc.user_id = u.id
      AND cc.organization_id = u.organization_id
  );

-- 2. Verificar se foi criado
SELECT 
  cc.id,
  cc.name,
  cc.user_id,
  cc.linked_email,
  cc.default_split_percentage,
  cc.organization_id,
  cc.is_active,
  cc.created_at
FROM cost_centers cc
WHERE cc.user_id = '58682b6b-0f9a-4ef7-a3db-beaaa42e13f2';

-- 3. Ajustar percentuais se necessário (soma deve ser 100%)
-- Execute este bloco SOMENTE se a soma dos percentuais ultrapassar 100%
/*
-- Ver total atual
SELECT 
  organization_id,
  SUM(default_split_percentage) as total_percentage
FROM cost_centers
WHERE organization_id = 'c30389a9-0842-404f-b782-f46f30385618'
  AND is_active = true
GROUP BY organization_id;

-- Se o total for > 100%, ajustar proporcionalmente
WITH total AS (
  SELECT SUM(default_split_percentage) as sum
  FROM cost_centers
  WHERE organization_id = 'c30389a9-0842-404f-b782-f46f30385618'
    AND is_active = true
)
UPDATE cost_centers cc
SET default_split_percentage = ROUND((cc.default_split_percentage / total.sum) * 100, 2)
FROM total
WHERE cc.organization_id = 'c30389a9-0842-404f-b782-f46f30385618'
  AND cc.is_active = true;
*/

