-- ============================================================================
-- FIX: RLS baseado no TIPO de organização (solo vs family)
-- ============================================================================
-- REGRA:
-- - organization.type = 'family': todos veem TUDO da organização
-- - organization.type = 'solo': usuário vê apenas SUAS transações (user_id ou cost_center_id)
-- ============================================================================

-- PARTE 1: Função helper para obter tipo da organização
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
DECLARE
  auth_user_id UUID;
  org_type TEXT;
  user_org_id UUID;
BEGIN
  auth_user_id := auth.uid();
  
  -- Buscar organization_id do usuário
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Se não encontrou, tentar por email
  IF user_org_id IS NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE email = (auth.jwt() ->> 'email') AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Se encontrou organização, buscar tipo
  IF user_org_id IS NOT NULL THEN
    SELECT type INTO org_type
    FROM organizations
    WHERE id = user_org_id;
  END IF;
  
  RETURN org_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 2: Função helper para obter cost_center_id do usuário
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_cost_center_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  cost_center_id UUID;
  user_org_id UUID;
BEGIN
  auth_user_id := auth.uid();
  
  -- Buscar organization_id primeiro
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      -- Buscar cost_center vinculado ao usuário
      SELECT id INTO cost_center_id
      FROM cost_centers
      WHERE organization_id = user_org_id 
      AND user_id = auth_user_id 
      AND is_active = true
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN cost_center_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 3: Corrigir política de EXPENSES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

CREATE POLICY "Users can view expenses based on org type"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id() AND
  (
    -- Se organização é 'family': mostrar tudo
    get_user_org_type() = 'family' OR
    -- Se organização é 'solo': mostrar apenas do próprio usuário
    (
      get_user_org_type() = 'solo' AND
      (
        user_id = get_current_user_id() OR
        cost_center_id = get_user_cost_center_id()
      )
    )
  )
);

-- PARTE 4: Corrigir política de INCOMES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;

CREATE POLICY "Users can view incomes based on org type"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id() AND
  (
    -- Se organização é 'family': mostrar tudo
    get_user_org_type() = 'family' OR
    -- Se organização é 'solo': mostrar apenas do próprio usuário
    (
      get_user_org_type() = 'solo' AND
      (
        user_id = get_current_user_id() OR
        cost_center_id = get_user_cost_center_id()
      )
    )
  )
);

-- PARTE 5: Corrigir política de BILLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view bills from their organization" ON bills;

CREATE POLICY "Users can view bills based on org type"
ON bills
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id() AND
  (
    get_user_org_type() = 'family' OR
    (
      get_user_org_type() = 'solo' AND
      user_id = get_current_user_id()
    )
  )
);

-- PARTE 6: Outras tabelas (cards, budgets, etc.) - mostrar tudo da organização
-- (geralmente compartilhados ou baseados no tipo da org)
-- ============================================================================

-- CARDS: mostrar todos da organização (cards geralmente são compartilhados)
DROP POLICY IF EXISTS "Users can view cards from their organization" ON cards;
CREATE POLICY "Users can view cards from their organization"
ON cards
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- BUDGETS: mostrar todos da organização
DROP POLICY IF EXISTS "Users can view budgets from their organization" ON budgets;
CREATE POLICY "Users can view budgets from their organization"
ON budgets
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- COST CENTERS: mostrar todos da organização
DROP POLICY IF EXISTS "Users can view cost centers from their organization" ON cost_centers;
CREATE POLICY "Users can view cost centers from their organization"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- EXPENSE_SPLITS: via expense (que já está protegido)
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
    AND (
      get_user_org_type() = 'family' OR
      (
        get_user_org_type() = 'solo' AND
        (
          expenses.user_id = get_current_user_id() OR
          expenses.cost_center_id = get_user_cost_center_id()
        )
      )
    )
  )
);

-- INCOME_SPLITS: via income (que já está protegido)
DROP POLICY IF EXISTS "Users can view income splits from their organization" ON income_splits;
CREATE POLICY "Users can view income splits from their organization"
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND incomes.organization_id = get_user_organization_id()
    AND (
      get_user_org_type() = 'family' OR
      (
        get_user_org_type() = 'solo' AND
        (
          incomes.user_id = get_current_user_id() OR
          incomes.cost_center_id = get_user_cost_center_id()
        )
      )
    )
  )
);

-- PARTE 7: Garantir funções helper existem
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
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
  
  SELECT organization_id INTO user_org_id
  FROM users
  WHERE email = (auth.jwt() ->> 'email') AND is_active = true
  LIMIT 1;
  
  RETURN user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
BEGIN
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    RETURN auth_user_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 8: Diagnóstico
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  test_org_type TEXT;
  test_user_id UUID;
  test_cost_center_id UUID;
  expense_count_family INTEGER;
  expense_count_solo INTEGER;
BEGIN
  test_org_id := get_user_organization_id();
  test_org_type := get_user_org_type();
  test_user_id := get_current_user_id();
  test_cost_center_id := get_user_cost_center_id();
  
  IF test_org_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DIAGNÓSTICO COMPLETO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Tipo da organização: %', COALESCE(test_org_type, 'N/A');
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Cost Center ID: %', COALESCE(test_cost_center_id::TEXT, 'N/A');
    RAISE NOTICE '';
    
    -- Contar expenses
    SELECT COUNT(*) INTO expense_count_family
    FROM expenses
    WHERE organization_id = test_org_id;
    
    IF test_org_type = 'solo' THEN
      SELECT COUNT(*) INTO expense_count_solo
      FROM expenses
      WHERE organization_id = test_org_id
      AND (user_id = test_user_id OR cost_center_id = test_cost_center_id);
      
      RAISE NOTICE 'Total expenses na organização: %', expense_count_family;
      RAISE NOTICE 'Expenses visíveis (solo): %', expense_count_solo;
    ELSE
      RAISE NOTICE 'Total expenses na organização: %', expense_count_family;
      RAISE NOTICE 'Expenses visíveis (family): % (todas)', expense_count_family;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS configurado corretamente:';
    IF test_org_type = 'family' THEN
      RAISE NOTICE '   - Modo FAMILY: todos veem tudo';
    ELSIF test_org_type = 'solo' THEN
      RAISE NOTICE '   - Modo SOLO: apenas suas transações';
    ELSE
      RAISE WARNING '   - Tipo desconhecido: %', test_org_type;
    END IF;
    
  ELSE
    RAISE WARNING '⚠️  Não foi possível obter dados do usuário';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ FIX APLICADO COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Recarregue a página do dashboard';
  RAISE NOTICE '2. Verifique se as expenses aparecem corretamente';
  RAISE NOTICE '   - Family: deve mostrar TODAS';
  RAISE NOTICE '   - Solo: deve mostrar apenas SUAS';
END $$;

