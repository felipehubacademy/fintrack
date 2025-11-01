-- ============================================================================
-- FIX ULTRA SIMPLES: Remove complexidade das subqueries
-- ============================================================================

-- Garantir função helper funcionando
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

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view all expenses from their organization" ON expenses;

-- Política SIMPLES usando função helper (sem subqueries complexas)
CREATE POLICY "Users can view expenses from their organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
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

-- Fazer o mesmo para incomes
DROP POLICY IF EXISTS "Users can view incomes" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes based on org type" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;
DROP POLICY IF EXISTS "Users can view all incomes from their organization" ON incomes;

CREATE POLICY "Users can view incomes from their organization"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
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

-- Expense splits
DROP POLICY IF EXISTS "Users can view expense splits" ON expense_splits;
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

-- Income splits
DROP POLICY IF EXISTS "Users can view income splits" ON income_splits;
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

-- Teste: verificar quantas expenses são visíveis agora
SELECT 
  'Resultado' as info,
  COUNT(*) as total_expenses_visiveis
FROM expenses
WHERE organization_id = get_user_organization_id();

-- Verificar tipo da organização
SELECT 
  'Tipo da Organização' as info,
  get_user_org_type() as org_type,
  get_user_organization_id() as org_id;

-- Listar policies ativas
SELECT 
  'Policies Ativas' as info,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'expenses'
AND cmd = 'SELECT';

SELECT '✅ FIX APLICADO!' as status;

