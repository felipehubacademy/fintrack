-- ============================================================================
-- FIX FINAL: Garantir acesso completo em contas familiares
-- ============================================================================
-- IMPORTANTE: Em contas familiares, TODOS veem TUDO
-- O RLS apenas verifica se pertence à organização
-- A privacidade (individual vs compartilhado) é controlada no FRONTEND
-- ============================================================================

-- PARTE 1: Garantir funções helper funcionando
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

CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
BEGIN
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      RETURN (user_org_id = org_id);
    END IF;
  END IF;
  
  -- Fallback para email (menos confiável)
  SELECT organization_id INTO user_org_id
  FROM users
  WHERE email = (auth.jwt() ->> 'email') AND is_active = true
  LIMIT 1;
  
  RETURN (user_org_id = org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- PARTE 2: Corrigir políticas para mostrar TUDO da organização
-- Não filtrar por privacidade (is_shared, cost_center_id) - isso é do frontend
-- ============================================================================

-- EXPENSES: Mostrar TODAS da organização
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
CREATE POLICY "Users can view expenses from their organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- INCOMES: Mostrar TODAS da organização
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;
CREATE POLICY "Users can view incomes from their organization"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- BILLS: Mostrar TODAS da organização
DROP POLICY IF EXISTS "Users can view bills from their organization" ON bills;
CREATE POLICY "Users can view bills from their organization"
ON bills
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- CARDS: Mostrar TODAS da organização
DROP POLICY IF EXISTS "Users can view cards from their organization" ON cards;
CREATE POLICY "Users can view cards from their organization"
ON cards
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- BUDGETS: Mostrar TODOS da organização
DROP POLICY IF EXISTS "Users can view budgets from their organization" ON budgets;
CREATE POLICY "Users can view budgets from their organization"
ON budgets
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- COST CENTERS: Mostrar TODOS da organização
DROP POLICY IF EXISTS "Users can view cost centers from their organization" ON cost_centers;
CREATE POLICY "Users can view cost centers from their organization"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_organization_id()
);

-- EXPENSE_SPLITS: Via expense (que já está protegido)
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

-- INCOME_SPLITS: Via income (que já está protegido)
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
  )
);

-- PARTE 3: Verificar e garantir RLS habilitado
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ RLS habilitado em todas as tabelas';
END $$;

-- PARTE 4: Diagnóstico
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  expense_count INTEGER;
  income_count INTEGER;
  cost_center_count INTEGER;
  org_type TEXT;
BEGIN
  test_org_id := get_user_organization_id();
  
  IF test_org_id IS NOT NULL THEN
    -- Buscar tipo da organização
    SELECT type INTO org_type
    FROM organizations
    WHERE id = test_org_id;
    
    -- Contar registros
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
    RAISE NOTICE '✅ DIAGNÓSTICO COMPLETO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization ID: %', test_org_id;
    RAISE NOTICE 'Tipo: %', COALESCE(org_type, 'N/A');
    RAISE NOTICE 'Expenses na organização: %', expense_count;
    RAISE NOTICE 'Incomes na organização: %', income_count;
    RAISE NOTICE 'Cost Centers na organização: %', cost_center_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NOTA: RLS mostra TODAS as expenses/incomes da organização';
    RAISE NOTICE '   O frontend filtra por privacidade baseado no tipo da org';
    RAISE NOTICE '   - family: todos veem tudo';
    RAISE NOTICE '   - solo: apenas próprio cost_center';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️  get_user_organization_id() retornou NULL';
    RAISE WARNING '   Verifique se usuário está autenticado';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ FIX APLICADO COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Recarregue a página do dashboard';
  RAISE NOTICE '2. Verifique se TODAS as expenses aparecem';
  RAISE NOTICE '3. Em contas familiares, todos devem ver tudo';
  RAISE NOTICE '4. Em contas solo, frontend filtra individual';
END $$;

