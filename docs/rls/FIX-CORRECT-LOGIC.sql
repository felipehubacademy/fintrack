-- ============================================================================
-- FIX CORRETO: Lógica baseada em cost_center_id e is_shared
-- ============================================================================
-- REGRA CORRETA:
-- - Transações compartilhadas: cost_center_id IS NULL (ou is_shared = true)
-- - Transações individuais: cost_center_id NÃO é NULL
-- - Em FAMILY: todos veem tudo
-- - Em SOLO: usuário vê suas individuais (por cost_center_id) + compartilhadas
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

-- PARTE 2: Corrigir política de EXPENSES com lógica correta
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
    -- SOLO: mostrar transações individuais do usuário + compartilhadas
    (
      get_user_org_type() = 'solo' AND
      (
        -- Transações compartilhadas (sem cost_center_id ou is_shared = true)
        cost_center_id IS NULL OR
        -- Transações individuais do usuário (cost_center_id do usuário)
        cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
        ) OR
        -- Fallback: por user_id direto
        user_id = auth.uid()
      )
    )
  )
);

-- PARTE 3: Corrigir política de INCOMES com mesma lógica
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
        -- Compartilhadas
        cost_center_id IS NULL OR
        -- Individuais do usuário
        cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
        ) OR
        -- Fallback: por user_id
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
          expenses.cost_center_id IS NULL OR
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
          incomes.cost_center_id IS NULL OR
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
  shared_expenses INTEGER;
  individual_expenses INTEGER;
  user_individual_expenses INTEGER;
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
  RAISE NOTICE '✅ DIAGNÓSTICO COMPLETO';
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
    
    -- Compartilhadas (sem cost_center_id)
    SELECT COUNT(*) INTO shared_expenses
    FROM expenses
    WHERE organization_id = test_org_id
    AND cost_center_id IS NULL;
    
    -- Individuais (com cost_center_id)
    SELECT COUNT(*) INTO individual_expenses
    FROM expenses
    WHERE organization_id = test_org_id
    AND cost_center_id IS NOT NULL;
    
    -- Individuais do usuário
    IF test_cc_id IS NOT NULL THEN
      SELECT COUNT(*) INTO user_individual_expenses
      FROM expenses
      WHERE organization_id = test_org_id
      AND cost_center_id = test_cc_id;
    ELSE
      user_individual_expenses := 0;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTATÍSTICAS:';
    RAISE NOTICE 'Total expenses: %', total_expenses;
    RAISE NOTICE 'Compartilhadas (cost_center_id IS NULL): %', shared_expenses;
    RAISE NOTICE 'Individuais (cost_center_id NOT NULL): %', individual_expenses;
    RAISE NOTICE 'Individuais do usuário (cost_center_id = %): %', COALESCE(test_cc_id::TEXT, 'NULL'), user_individual_expenses;
    
    IF test_org_type = 'family' THEN
      visible_expenses := total_expenses;
      RAISE NOTICE '';
      RAISE NOTICE '✅ Modo FAMILY: todas devem ser visíveis';
      RAISE NOTICE 'Expenses visíveis esperadas: %', visible_expenses;
    ELSIF test_org_type = 'solo' THEN
      visible_expenses := shared_expenses + user_individual_expenses;
      RAISE NOTICE '';
      RAISE NOTICE '✅ Modo SOLO: compartilhadas + suas individuais';
      RAISE NOTICE 'Expenses visíveis esperadas: % (compartilhadas: % + suas individuais: %)', 
        visible_expenses, shared_expenses, user_individual_expenses;
    END IF;
    
    IF test_cc_id IS NULL THEN
      RAISE WARNING '';
      RAISE WARNING '⚠️  Cost center não encontrado!';
      RAISE WARNING '   Criando cost center agora...';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Recarregue o dashboard e teste';
END $$;

