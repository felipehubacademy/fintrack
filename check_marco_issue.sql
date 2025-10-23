-- ============================================================================
-- INVESTIGAÇÃO: Por que Marco não recebeu centro de custo?
-- ============================================================================

-- 1. Verificar se os TRIGGERS existem e estão ativos
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'organization_members'
ORDER BY trigger_name;

-- 2. Verificar se as FUNÇÕES existem
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('auto_link_cost_center_to_user', 'auto_create_cost_center_for_user')
ORDER BY routine_name;

-- 3. Verificar dados do MARCO
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.organization_id,
  u.created_at as user_created_at
FROM users u
WHERE u.email = 'marco.salles@manzini.cc';

-- 4. Verificar se Marco está em ORGANIZATION_MEMBERS
SELECT 
  om.id,
  om.user_id,
  om.organization_id,
  om.role,
  om.created_at as joined_at
FROM organization_members om
WHERE om.user_id = '58682b6b-0f9a-4ef7-a3db-beaaa42e13f2';

-- 5. Verificar COST_CENTERS do Marco
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
WHERE cc.linked_email = 'marco.salles@manzini.cc'
   OR cc.user_id = '58682b6b-0f9a-4ef7-a3db-beaaa42e13f2';

-- 6. Verificar TODOS os cost_centers da organização do Marco
SELECT 
  cc.id,
  cc.name,
  cc.user_id,
  cc.linked_email,
  cc.default_split_percentage,
  u.name as user_name,
  u.email as user_email
FROM cost_centers cc
LEFT JOIN users u ON u.id = cc.user_id
WHERE cc.organization_id = 'c30389a9-0842-404f-b782-f46f30385618'
ORDER BY cc.created_at;

-- 7. Verificar histórico de PENDING_INVITES
SELECT 
  pi.id,
  pi.email,
  pi.name,
  pi.role,
  pi.organization_id,
  pi.accepted_at,
  pi.created_at
FROM pending_invites pi
WHERE pi.email = 'marco.salles@manzini.cc'
ORDER BY pi.created_at DESC;

-- 8. Verificar ONBOARDING_PROGRESS do Marco
SELECT 
  op.*
FROM onboarding_progress op
WHERE op.user_id = '58682b6b-0f9a-4ef7-a3db-beaaa42e13f2';

