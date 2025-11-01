-- ============================================================================
-- DEBUG e FIX para FAMILY - Diagnóstico completo
-- ============================================================================

-- DIAGNÓSTICO: Verificar o que está acontecendo
-- ============================================================================

-- 1. Verificar funções
SELECT 
  '1. Funções Helper' as etapa,
  auth.uid() as auth_user_id,
  get_user_organization_id() as org_id,
  get_user_org_type() as org_type;

-- 2. Verificar usuário e organização
SELECT 
  '2. Dados do Usuário' as etapa,
  u.id as user_id,
  u.email,
  u.organization_id,
  u.is_active as user_active,
  o.id as org_id_check,
  o.type as org_type_check,
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.id = auth.uid();

-- 3. Verificar cost centers
SELECT 
  '3. Cost Centers da Organização' as etapa,
  cc.id as cost_center_id,
  cc.name,
  cc.user_id,
  cc.is_active
FROM cost_centers cc
WHERE cc.organization_id = get_user_organization_id();

-- 4. Contar expenses total
SELECT 
  '4. Total Expenses' as etapa,
  COUNT(*) as total_expenses
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- 5. Verificar expenses (primeiras 10)
SELECT 
  '5. Expenses da Organização (primeiras 10)' as etapa,
  expenses.id,
  expenses.description,
  expenses.amount,
  expenses.cost_center_id,
  expenses.user_id,
  expenses.organization_id,
  expenses.date
FROM expenses
WHERE expenses.organization_id = get_user_organization_id()
ORDER BY expenses.date DESC
LIMIT 10;

-- 6. Testar política diretamente (simular query que frontend faz)
SELECT 
  '6. Teste de Política RLS' as etapa,
  COUNT(*) as expenses_visiveis,
  'Deve mostrar todas se FAMILY' as observacao
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- CORREÇÃO: Política mais simples e direta para FAMILY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

-- Política SIMPLES: se for family mostra TUDO, se for solo mostra só do cost_center
CREATE POLICY "Users can view expenses"
ON expenses
FOR SELECT
TO authenticated
USING (
  -- Primeiro: garantir que pertence à organização
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL AND
  (
    -- FAMILY: mostrar TUDO (sem filtro adicional)
    (SELECT type FROM organizations WHERE id = get_user_organization_id()) = 'family' OR
    -- SOLO: mostrar apenas do cost_center do usuário
    (
      (SELECT type FROM organizations WHERE id = get_user_organization_id()) = 'solo' AND
      cost_center_id IN (
        SELECT id FROM cost_centers
        WHERE organization_id = get_user_organization_id()
        AND user_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

-- Teste após correção
SELECT 
  '7. Após Correção' as etapa,
  COUNT(*) as expenses_visiveis_agora
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- Verificar policies ativas
SELECT 
  '8. Policies Ativas de Expenses' as etapa,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'expenses';

