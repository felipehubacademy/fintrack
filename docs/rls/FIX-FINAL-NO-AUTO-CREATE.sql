-- ============================================================================
-- FIX FINAL: Sem criação automática de cost_center
-- ============================================================================
-- REGRA:
-- - FAMILY: todos veem TUDO da organização
-- - SOLO: usuário vê APENAS suas transações individuais (cost_center_id = seu cost_center)
-- ============================================================================

-- PARTE 1: Verificar se usuário tem cost_center (SEM CRIAR)
-- ============================================================================

DO $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  existing_cost_center_id UUID;
BEGIN
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      -- Verificar se tem cost_center (NÃO criar)
      SELECT id INTO existing_cost_center_id
      FROM cost_centers
      WHERE organization_id = user_org_id 
      AND user_id = auth_user_id 
      AND is_active = true
      LIMIT 1;
      
      IF existing_cost_center_id IS NOT NULL THEN
        RAISE NOTICE '✅ Cost center encontrado: %', existing_cost_center_id;
      ELSE
        RAISE WARNING '⚠️  Cost center NÃO encontrado para o usuário!';
        RAISE WARNING '   As transações individuais podem não aparecer.';
        RAISE WARNING '   Crie um cost_center manualmente ou use user_id nas expenses.';
      END IF;
    END IF;
  END IF;
END $$;

-- PARTE 2: Política de EXPENSES - SOLO mostra APENAS próprias
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

CREATE POLICY "Users can view expenses"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL AND
  (
    -- FAMILY: mostrar TUDO da organização
    get_user_org_type() = 'family' OR
    -- SOLO: mostrar APENAS transações individuais do usuário
    (
      get_user_org_type() = 'solo' AND
      (
        -- Opção 1: cost_center_id do usuário (se tiver cost_center)
        cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
        ) OR
        -- Opção 2: user_id direto (fallback se não tiver cost_center)
        user_id = auth.uid()
      )
    )
  )
);

-- PARTE 3: Política de INCOMES - mesma lógica
-- ============================================================================

DROP POLICY IF EXISTS "Users can view incomes" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes based on org type" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;

CREATE POLICY "Users can view incomes"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL AND
  (
    get_user_org_type() = 'family' OR
    (
      get_user_org_type() = 'solo' AND
      (
        cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
        ) OR
        user_id = auth.uid()
      )
    )
  )
);

-- PARTE 4: EXPENSE_SPLITS e INCOME_SPLITS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expense splits" ON expense_splits;
CREATE POLICY "Users can view expense splits"
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
          expenses.cost_center_id IN (
            SELECT id FROM cost_centers
            WHERE organization_id = get_user_organization_id()
            AND user_id = auth.uid()
            AND is_active = true
          ) OR
          expenses.user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can view income splits" ON income_splits;
CREATE POLICY "Users can view income splits"
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
          incomes.cost_center_id IN (
            SELECT id FROM cost_centers
            WHERE organization_id = get_user_organization_id()
            AND user_id = auth.uid()
            AND is_active = true
          ) OR
          incomes.user_id = auth.uid()
        )
      )
    )
  )
);

-- PARTE 5: Garantir funções helper
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
    
    RETURN user_org_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
DECLARE
  org_id UUID;
  org_type TEXT;
BEGIN
  org_id := get_user_organization_id();
  
  IF org_id IS NOT NULL THEN
    SELECT type INTO org_type
    FROM organizations
    WHERE id = org_id;
  END IF;
  
  RETURN org_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 6: Diagnóstico
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  test_org_type TEXT;
  test_user_id UUID;
  test_cc_id UUID;
  total_expenses INTEGER;
  user_expenses INTEGER;
BEGIN
  test_org_id := get_user_organization_id();
  test_org_type := get_user_org_type();
  test_user_id := auth.uid();
  
  -- Buscar cost_center do usuário
  IF test_user_id IS NOT NULL AND test_org_id IS NOT NULL THEN
    SELECT id INTO test_cc_id
    FROM cost_centers
    WHERE organization_id = test_org_id 
    AND user_id = test_user_id 
    AND is_active = true
    LIMIT 1;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DIAGNÓSTICO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization ID: %', COALESCE(test_org_id::TEXT, 'NULL');
  RAISE NOTICE 'Tipo: %', COALESCE(test_org_type, 'NULL');
  RAISE NOTICE 'User ID: %', COALESCE(test_user_id::TEXT, 'NULL');
  RAISE NOTICE 'Cost Center ID: %', COALESCE(test_cc_id::TEXT, 'NULL');
  
  IF test_org_id IS NOT NULL THEN
    SELECT COUNT(*) INTO total_expenses
    FROM expenses
    WHERE organization_id = test_org_id;
    
    -- Expenses do usuário
    IF test_cc_id IS NOT NULL THEN
      SELECT COUNT(*) INTO user_expenses
      FROM expenses
      WHERE organization_id = test_org_id
      AND (cost_center_id = test_cc_id OR user_id = test_user_id);
    ELSE
      SELECT COUNT(*) INTO user_expenses
      FROM expenses
      WHERE organization_id = test_org_id
      AND user_id = test_user_id;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTATÍSTICAS:';
    RAISE NOTICE 'Total expenses: %', total_expenses;
    
    IF test_org_type = 'family' THEN
      RAISE NOTICE 'Expenses visíveis (FAMILY): % (TODAS)', total_expenses;
    ELSIF test_org_type = 'solo' THEN
      RAISE NOTICE 'Expenses do usuário (SOLO): %', user_expenses;
      RAISE NOTICE 'Expenses visíveis (SOLO): % (APENAS SUAS)', user_expenses;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Recarregue o dashboard e teste';
END $$;

