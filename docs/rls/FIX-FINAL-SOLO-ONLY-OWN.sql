-- ============================================================================
-- FIX FINAL: Lógica correta para SOLO e FAMILY
-- ============================================================================
-- REGRA CORRETA:
-- - FAMILY: todos veem TUDO da organização
-- - SOLO: usuário vê APENAS suas transações individuais (cost_center_id = seu cost_center)
--   NÃO EXISTE compartilhadas em SOLO!
-- ============================================================================

-- PARTE 1: Garantir que usuário tem cost_center
-- ============================================================================

DO $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  existing_cost_center_id UUID;
  user_name TEXT;
  user_email TEXT;
BEGIN
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT 
      organization_id, 
      name, 
      email 
    INTO user_org_id, user_name, user_email
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      -- Verificar se já tem cost_center
      SELECT id INTO existing_cost_center_id
      FROM cost_centers
      WHERE organization_id = user_org_id 
      AND user_id = auth_user_id 
      AND is_active = true
      LIMIT 1;
      
      -- Se não tem, criar
      IF existing_cost_center_id IS NULL THEN
        INSERT INTO cost_centers (
          organization_id,
          name,
          user_id,
          linked_email,
          default_split_percentage,
          color,
          is_active
        ) VALUES (
          user_org_id,
          COALESCE(user_name, 'Usuário'),
          auth_user_id,
          user_email,
          100.00,
          '#3B82F6',
          true
        )
        RETURNING id INTO existing_cost_center_id;
        
        RAISE NOTICE '✅ Cost center criado: %', existing_cost_center_id;
      ELSE
        RAISE NOTICE '✅ Cost center já existe: %', existing_cost_center_id;
      END IF;
    END IF;
  END IF;
END $$;

-- PARTE 2: Corrigir política de EXPENSES - SOLO mostra APENAS próprias
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
        -- Prioridade 1: cost_center_id do usuário
        cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
        ) OR
        -- Prioridade 2: fallback por user_id direto
        user_id = auth.uid()
      )
    )
  )
);

-- PARTE 3: Corrigir política de INCOMES - mesma lógica
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

-- PARTE 4: Corrigir EXPENSE_SPLITS e INCOME_SPLITS
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

-- PARTE 6: Diagnóstico final
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  test_org_type TEXT;
  test_user_id UUID;
  test_cc_id UUID;
  total_expenses INTEGER;
  user_expenses INTEGER;
  visible_expenses INTEGER;
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
  RAISE NOTICE '✅ DIAGNÓSTICO FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization ID: %', COALESCE(test_org_id::TEXT, 'NULL');
  RAISE NOTICE 'Tipo: %', COALESCE(test_org_type, 'NULL');
  RAISE NOTICE 'User ID: %', COALESCE(test_user_id::TEXT, 'NULL');
  RAISE NOTICE 'Cost Center ID: %', COALESCE(test_cc_id::TEXT, 'NULL');
  
  IF test_org_id IS NOT NULL THEN
    -- Contar expenses
    SELECT COUNT(*) INTO total_expenses
    FROM expenses
    WHERE organization_id = test_org_id;
    
    -- Expenses do usuário (por cost_center_id ou user_id)
    IF test_cc_id IS NOT NULL THEN
      SELECT COUNT(*) INTO user_expenses
      FROM expenses
      WHERE organization_id = test_org_id
      AND (
        cost_center_id = test_cc_id OR
        user_id = test_user_id
      );
    ELSE
      SELECT COUNT(*) INTO user_expenses
      FROM expenses
      WHERE organization_id = test_org_id
      AND user_id = test_user_id;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTATÍSTICAS:';
    RAISE NOTICE 'Total expenses na organização: %', total_expenses;
    
    IF test_org_type = 'family' THEN
      visible_expenses := total_expenses;
      RAISE NOTICE 'Expenses visíveis (FAMILY): % (TODAS)', visible_expenses;
      RAISE NOTICE '';
      RAISE NOTICE '✅ Modo FAMILY: todos veem tudo';
    ELSIF test_org_type = 'solo' THEN
      visible_expenses := user_expenses;
      RAISE NOTICE 'Expenses do usuário (SOLO): %', user_expenses;
      RAISE NOTICE 'Expenses visíveis (SOLO): % (APENAS SUAS)', visible_expenses;
      RAISE NOTICE '';
      RAISE NOTICE '✅ Modo SOLO: apenas suas transações individuais';
      RAISE NOTICE '   (NÃO mostra compartilhadas - não existem em SOLO)';
      
      IF user_expenses = 0 AND total_expenses > 0 THEN
        RAISE WARNING '';
        RAISE WARNING '⚠️  PROBLEMA: Há expenses mas nenhuma com seu cost_center_id ou user_id!';
        RAISE WARNING '   Verifique se as expenses têm cost_center_id ou user_id correto';
      END IF;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Recarregue o dashboard e teste';
END $$;

