-- ============================================================================
-- FIX FINAL: Garantir que todas as expenses da organização sejam visíveis
-- Execute APENAS este script
-- ============================================================================

-- PARTE 1: Garantir que funções helper estão corretas
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      RETURN user_org_id;
    END IF;
  END IF;
  
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT organization_id INTO user_org_id
  FROM users
  WHERE email = user_email AND is_active = true
  LIMIT 1;
  
  RETURN user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 2: Corrigir política de expenses para mostrar TODAS da organização
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

CREATE POLICY "Users can view expenses from their organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  -- Mostrar TODAS as expenses da organização
  -- Frontend filtra por privacidade depois (is_shared, cost_center_id)
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- PARTE 3: Fazer o mesmo para incomes
-- ============================================================================

DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;

CREATE POLICY "Users can view incomes from their organization"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- PARTE 4: Garantir que expense_splits funciona
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expense splits from their organization" ON expense_splits;

CREATE POLICY "Users can view expense splits from their organization"
ON expense_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND expenses.organization_id = get_user_organization_id()
  )
);

-- PARTE 5: Garantir que cost_centers funciona
-- ============================================================================

DROP POLICY IF EXISTS "Users can view cost centers from their organization" ON cost_centers;

CREATE POLICY "Users can view cost centers from their organization"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- PARTE 6: Teste e diagnóstico
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  expense_count INTEGER;
  income_count INTEGER;
  cost_center_count INTEGER;
BEGIN
  -- Testar função
  test_org_id := get_user_organization_id();
  
  IF test_org_id IS NOT NULL THEN
    -- Contar registros (para debug)
    SELECT COUNT(*) INTO expense_count
    FROM expenses
    WHERE organization_id = test_org_id;
    
    SELECT COUNT(*) INTO income_count
    FROM incomes
    WHERE organization_id = test_org_id;
    
    SELECT COUNT(*) INTO cost_center_count
    FROM cost_centers
    WHERE organization_id = test_org_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DIAGNÓSTICO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Expenses na organização: %', expense_count;
    RAISE NOTICE 'Incomes na organização: %', income_count;
    RAISE NOTICE 'Cost Centers na organização: %', cost_center_count;
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️  get_user_organization_id() retornou NULL';
    RAISE WARNING '   Verifique se usuário está autenticado e tem organization_id';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ FIX APLICADO COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Recarregue a página do dashboard';
  RAISE NOTICE '2. Verifique se todas as expenses aparecem';
  RAISE NOTICE '3. O frontend filtra por privacidade automaticamente';
END $$;

