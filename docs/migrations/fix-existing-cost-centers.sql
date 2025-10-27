-- ============================================================================
-- Migration: Corrigir cost centers existentes que estão com 100% cada
-- Data: 2025-10-27
-- Descrição: Rebalancear cost centers de organizações com 2 membros para 50/50
-- ============================================================================

-- Query para identificar organizações com 2 membros mas cost centers desbalanceados
WITH org_members AS (
  SELECT 
    organization_id,
    COUNT(*) as member_count
  FROM users
  WHERE is_active = true 
    AND role IN ('admin', 'member')
    AND organization_id IS NOT NULL
  GROUP BY organization_id
  HAVING COUNT(*) = 2
),
org_centers AS (
  SELECT 
    organization_id,
    COUNT(*) as center_count,
    SUM(CASE WHEN default_split_percentage = 100 THEN 1 ELSE 0 END) as centers_100
  FROM cost_centers
  WHERE user_id IS NOT NULL
    AND is_active = true
  GROUP BY organization_id
  HAVING COUNT(*) = 2 AND SUM(CASE WHEN default_split_percentage = 100 THEN 1 ELSE 0 END) = 2
)
UPDATE cost_centers
SET 
  default_split_percentage = 50.00,
  updated_at = NOW()
WHERE organization_id IN (
  SELECT org_members.organization_id
  FROM org_members
  INNER JOIN org_centers ON org_members.organization_id = org_centers.organization_id
)
AND user_id IS NOT NULL
AND is_active = true;

-- Mostrar resultado
SELECT 
  'Cost centers corrigidos para 50/50' as status,
  COUNT(*) as cost_centers_updated
FROM cost_centers
WHERE default_split_percentage = 50.00;

