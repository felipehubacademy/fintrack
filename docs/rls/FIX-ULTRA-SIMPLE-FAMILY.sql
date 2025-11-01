-- ============================================================================
-- FIX ULTRA SIMPLES: Política mais direta possível
-- Remove todas as complexidades e usa apenas verificação básica
-- ============================================================================

-- Garantir funções helper básicas
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

-- Remover TODAS as políticas antigas
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;

-- Política ULTRA SIMPLES: apenas verifica organization_id
-- Deixa o frontend fazer filtro de privacidade se necessário
CREATE POLICY "Users can view all expenses from their organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

-- Fazer o mesmo para incomes
DROP POLICY IF EXISTS "Users can view incomes" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes based on org type" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;

CREATE POLICY "Users can view all incomes from their organization"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
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
  )
);

-- Teste final
SELECT 
  'Resultado' as info,
  COUNT(*) as total_expenses_visiveis
FROM expenses
WHERE organization_id = get_user_organization_id();

SELECT 
  '✅ Política simplificada aplicada!' as status,
  'RLS agora mostra TODAS as expenses da organização' as detalhe,
  'Frontend filtra por privacidade se necessário' as nota;

