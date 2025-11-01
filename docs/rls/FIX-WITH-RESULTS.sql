-- ============================================================================
-- FIX FINAL: Versão que mostra resultados visíveis
-- ============================================================================

-- PARTE 1: Corrigir políticas de EXPENSES e INCOMES
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
    get_user_org_type() = 'family' OR
    (
      get_user_org_type() = 'solo' AND
      cost_center_id IN (
        SELECT id FROM cost_centers
        WHERE organization_id = get_user_organization_id()
        AND user_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

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
      cost_center_id IN (
        SELECT id FROM cost_centers
        WHERE organization_id = get_user_organization_id()
        AND user_id = auth.uid()
        AND is_active = true
      )
    )
  )
);

-- PARTE 2: Corrigir EXPENSE_SPLITS e INCOME_SPLITS
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
        expenses.cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
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
        incomes.cost_center_id IN (
          SELECT id FROM cost_centers
          WHERE organization_id = get_user_organization_id()
          AND user_id = auth.uid()
          AND is_active = true
        )
      )
    )
  )
);

-- PARTE 3: Garantir funções helper
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

-- PARTE 4: DIAGNÓSTICO COM RESULTADOS VISÍVEIS
-- ============================================================================

-- Mostrar dados do usuário atual
SELECT 
  '1. Dados do Usuário' as info,
  auth.uid() as user_id,
  get_user_organization_id() as organization_id,
  get_user_org_type() as org_type;

-- Mostrar cost_center do usuário
SELECT 
  '2. Cost Center do Usuário' as info,
  id as cost_center_id,
  name,
  user_id,
  organization_id,
  is_active
FROM cost_centers
WHERE organization_id = get_user_organization_id()
AND user_id = auth.uid()
AND is_active = true;

-- Mostrar estatísticas de expenses
SELECT 
  '3. Estatísticas de Expenses' as info,
  COUNT(*) FILTER (WHERE organization_id = get_user_organization_id()) as total_na_org,
  COUNT(*) FILTER (
    WHERE organization_id = get_user_organization_id() 
    AND cost_center_id IN (
      SELECT id FROM cost_centers
      WHERE organization_id = get_user_organization_id()
      AND user_id = auth.uid()
      AND is_active = true
    )
  ) as com_seu_cost_center
FROM expenses
WHERE organization_id = get_user_organization_id();

-- Mostrar exemplo de expenses (primeiras 5)
SELECT 
  '4. Exemplos de Expenses (primeiras 5)' as info,
  id,
  description,
  amount,
  cost_center_id,
  user_id,
  organization_id,
  date
FROM expenses
WHERE organization_id = get_user_organization_id()
ORDER BY date DESC
LIMIT 5;

-- Verificar policies ativas
SELECT 
  '5. Policies Ativas' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('expenses', 'incomes', 'expense_splits', 'income_splits')
ORDER BY tablename, policyname;

-- Resultado final
SELECT 
  '✅ FIX APLICADO!' as status,
  'Recarregue o dashboard e teste' as next_step;

