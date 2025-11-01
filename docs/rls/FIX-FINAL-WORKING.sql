-- ============================================================================
-- FIX FINAL: Corrigir problema de cost_center_id NULL
-- ============================================================================
-- PROBLEMA: get_user_cost_center_id() retorna NULL
-- SOLUÇÃO: Usar principalmente user_id (mais confiável) e criar cost_center se necessário
-- ============================================================================

-- PARTE 1: Verificar e criar cost_center se não existir
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
    -- Buscar organization_id e dados do usuário
    SELECT 
      organization_id, 
      name, 
      email 
    INTO user_org_id, user_name, user_email
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    -- Se usuário tem organização
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

-- PARTE 2: Simplificar políticas - usar PRINCIPALMENTE user_id
-- ============================================================================

-- EXPENSES: Priorizar user_id, usar cost_center_id como fallback
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
    -- Family: mostrar tudo
    get_user_org_type() = 'family' OR
    -- Solo: mostrar por user_id (MAIS IMPORTANTE) ou cost_center_id
    (
      get_user_org_type() = 'solo' AND
      (
        -- Prioridade 1: user_id direto (mais confiável)
        user_id = auth.uid() OR
        -- Prioridade 2: cost_center_id (pode ser NULL, então não é obrigatório)
        (
          cost_center_id IS NOT NULL AND
          cost_center_id IN (
            SELECT id FROM cost_centers
            WHERE organization_id = get_user_organization_id()
            AND user_id = auth.uid()
            AND is_active = true
          )
        )
      )
    )
  )
);

-- INCOMES: Mesma lógica
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
        user_id = auth.uid() OR
        (
          cost_center_id IS NOT NULL AND
          cost_center_id IN (
            SELECT id FROM cost_centers
            WHERE organization_id = get_user_organization_id()
            AND user_id = auth.uid()
            AND is_active = true
          )
        )
      )
    )
  )
);

-- EXPENSE_SPLITS: Via expense
DROP POLICY IF EXISTS "Users can view expense splits" ON expense_splits;
DROP POLICY IF EXISTS "Users can view expense splits from their organization" ON expense_splits;

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
          expenses.user_id = auth.uid() OR
          (
            expenses.cost_center_id IS NOT NULL AND
            expenses.cost_center_id IN (
              SELECT id FROM cost_centers
              WHERE organization_id = get_user_organization_id()
              AND user_id = auth.uid()
              AND is_active = true
            )
          )
        )
      )
    )
  )
);

-- INCOME_SPLITS: Via income
DROP POLICY IF EXISTS "Users can view income splits" ON income_splits;
DROP POLICY IF EXISTS "Users can view income splits from their organization" ON income_splits;

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
          incomes.user_id = auth.uid() OR
          (
            incomes.cost_center_id IS NOT NULL AND
            incomes.cost_center_id IN (
              SELECT id FROM cost_centers
              WHERE organization_id = get_user_organization_id()
              AND user_id = auth.uid()
              AND is_active = true
            )
          )
        )
      )
    )
  )
);

-- PARTE 3: Garantir funções helper funcionando
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

-- PARTE 4: Diagnóstico final
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  test_org_type TEXT;
  test_user_id UUID;
  test_cc_id UUID;
  total_expenses INTEGER;
  expenses_by_user_id INTEGER;
  expenses_by_cost_center INTEGER;
  visible_expenses INTEGER;
BEGIN
  test_org_id := get_user_organization_id();
  test_org_type := get_user_org_type();
  test_user_id := auth.uid();
  
  -- Buscar cost_center
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
  RAISE NOTICE '✅ FIX APLICADO - DIAGNÓSTICO';
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
    
    SELECT COUNT(*) INTO expenses_by_user_id
    FROM expenses
    WHERE organization_id = test_org_id
    AND user_id = test_user_id;
    
    IF test_cc_id IS NOT NULL THEN
      SELECT COUNT(*) INTO expenses_by_cost_center
      FROM expenses
      WHERE organization_id = test_org_id
      AND cost_center_id = test_cc_id;
    ELSE
      expenses_by_cost_center := 0;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTATÍSTICAS:';
    RAISE NOTICE 'Total expenses: %', total_expenses;
    RAISE NOTICE 'Com user_id = %: %', test_user_id, expenses_by_user_id;
    RAISE NOTICE 'Com cost_center_id = %: %', COALESCE(test_cc_id::TEXT, 'NULL'), expenses_by_cost_center;
    
    IF test_org_type = 'family' THEN
      visible_expenses := total_expenses;
      RAISE NOTICE 'Expenses visíveis (family): % (todas)', visible_expenses;
    ELSIF test_org_type = 'solo' THEN
      visible_expenses := expenses_by_user_id;
      RAISE NOTICE 'Expenses visíveis (solo): % (por user_id)', visible_expenses;
    END IF;
    
    RAISE NOTICE '';
    IF expenses_by_user_id = 0 AND total_expenses > 0 THEN
      RAISE WARNING '⚠️  PROBLEMA: Há expenses mas nenhuma com seu user_id!';
      RAISE WARNING '   Verifique se as expenses têm user_id correto';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Recarregue o dashboard e teste';
END $$;

