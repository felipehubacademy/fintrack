-- ============================================================================
-- FIX: Permitir ver TODAS as expenses da organização (privacidade é do frontend)
-- ============================================================================
-- PROBLEMA: RLS pode estar sendo muito restritivo
-- SOLUÇÃO: Garantir que todas as expenses da organização sejam visíveis
--          A privacidade (individual vs compartilhado) é controlada no frontend
-- ============================================================================

-- Verificar e corrigir política de SELECT em expenses
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

-- Política SIMPLES: permitir todas as expenses da organização
-- O frontend filtra depois por privacidade (is_shared, cost_center_id)
CREATE POLICY "Users can view expenses from their organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  -- Apenas verificar que pertence à organização
  -- Não filtrar por privacidade aqui - isso é responsabilidade do frontend
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- Verificar se a função está funcionando
DO $$
DECLARE
  test_org_id UUID;
  expense_count INTEGER;
BEGIN
  test_org_id := get_user_organization_id();
  
  IF test_org_id IS NOT NULL THEN
    -- Contar expenses da organização (para debug)
    SELECT COUNT(*) INTO expense_count
    FROM expenses
    WHERE organization_id = test_org_id;
    
    RAISE NOTICE '✅ get_user_organization_id() retornou: %', test_org_id;
    RAISE NOTICE '📊 Total de expenses na organização: %', expense_count;
  ELSE
    RAISE WARNING '⚠️  get_user_organization_id() retornou NULL';
  END IF;
END $$;

-- Verificar RLS status
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'expenses';
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS está habilitado em expenses';
  ELSE
    RAISE WARNING '⚠️  RLS NÃO está habilitado em expenses';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Política de expenses corrigida!';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora todas as expenses da organização devem ser visíveis';
  RAISE NOTICE 'O frontend filtra por privacidade depois';
END $$;

