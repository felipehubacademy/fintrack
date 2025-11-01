-- ============================================================================
-- FIX SIMPLIFICADO: RLS mais simples e direto
-- Remove complexidade que pode estar causando problemas
-- ============================================================================

-- PARTE 1: Funções helper simplificadas e garantidas
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

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_cost_center_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  org_id UUID;
  cost_center_id UUID;
BEGIN
  auth_user_id := auth.uid();
  org_id := get_user_organization_id();
  
  IF auth_user_id IS NOT NULL AND org_id IS NOT NULL THEN
    SELECT id INTO cost_center_id
    FROM cost_centers
    WHERE organization_id = org_id 
    AND user_id = auth_user_id 
    AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN cost_center_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 2: Política SIMPLIFICADA de expenses
-- ============================================================================

DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

-- Política mais simples: se family mostra tudo, se solo mostra do usuário
CREATE POLICY "Users can view expenses"
ON expenses
FOR SELECT
TO authenticated
USING (
  -- Primeiro: verificar que pertence à organização
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL AND
  (
    -- Family: mostrar tudo
    get_user_org_type() = 'family' OR
    -- Solo: mostrar apenas do usuário (por user_id OU cost_center_id)
    (
      get_user_org_type() = 'solo' AND
      (
        user_id = auth.uid() OR
        cost_center_id = get_user_cost_center_id()
      )
    )
  )
);

-- PARTE 3: Política SIMPLIFICADA de incomes
-- ============================================================================

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
        cost_center_id = get_user_cost_center_id()
      )
    )
  )
);

-- PARTE 4: Garantir que outras tabelas mostram tudo da organização
-- ============================================================================

-- COST_CENTERS: mostrar todos
DROP POLICY IF EXISTS "Users can view cost centers from their organization" ON cost_centers;
CREATE POLICY "Users can view cost centers"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL
);

-- EXPENSE_SPLITS: via expense
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
          expenses.cost_center_id = get_user_cost_center_id()
        )
      )
    )
  )
);

-- INCOME_SPLITS: via income
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
          incomes.cost_center_id = get_user_cost_center_id()
        )
      )
    )
  )
);

-- BILLS, CARDS, BUDGETS: mostrar tudo da organização
DROP POLICY IF EXISTS "Users can view bills based on org type" ON bills;
DROP POLICY IF EXISTS "Users can view bills from their organization" ON bills;
CREATE POLICY "Users can view bills"
ON bills
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL
);

DROP POLICY IF EXISTS "Users can view cards from their organization" ON cards;
CREATE POLICY "Users can view cards"
ON cards
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL
);

DROP POLICY IF EXISTS "Users can view budgets from their organization" ON budgets;
CREATE POLICY "Users can view budgets"
ON budgets
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  organization_id IS NOT NULL
);

-- PARTE 5: Diagnóstico final
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  test_org_type TEXT;
  test_user_id UUID;
  test_cc_id UUID;
  total_expenses INTEGER;
  visible_expenses INTEGER;
BEGIN
  test_org_id := get_user_organization_id();
  test_org_type := get_user_org_type();
  test_user_id := get_current_user_id();
  test_cc_id := get_user_cost_center_id();
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX SIMPLIFICADO APLICADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization ID: %', COALESCE(test_org_id::TEXT, 'NULL');
  RAISE NOTICE 'Tipo: %', COALESCE(test_org_type, 'NULL');
  RAISE NOTICE 'User ID: %', COALESCE(test_user_id::TEXT, 'NULL');
  RAISE NOTICE 'Cost Center ID: %', COALESCE(test_cc_id::TEXT, 'NULL');
  
  IF test_org_id IS NOT NULL THEN
    SELECT COUNT(*) INTO total_expenses
    FROM expenses
    WHERE organization_id = test_org_id;
    
    IF test_org_type = 'family' THEN
      visible_expenses := total_expenses;
    ELSIF test_org_type = 'solo' THEN
      SELECT COUNT(*) INTO visible_expenses
      FROM expenses
      WHERE organization_id = test_org_id
      AND (user_id = test_user_id OR cost_center_id = test_cc_id);
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total expenses: %', total_expenses;
    RAISE NOTICE 'Expenses visíveis: %', visible_expenses;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Recarregue o dashboard e teste novamente';
  RAISE NOTICE 'Se ainda não funcionar, execute DEBUG-WHY-NO-EXPENSES.sql';
END $$;

