-- ============================================================================
-- FIX FINAL DEFINITIVO: Política que funciona
-- ============================================================================
-- Aplica correção direta sem depender de resultados de teste
-- ============================================================================

-- Garantir funções helper corretas
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

-- Remover TODAS as políticas SELECT existentes
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'expenses' 
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON expenses', policy_record.policyname);
  END LOOP;
END $$;

-- Criar política FINAL - simples e direta
-- FAMILY: mostra tudo, SOLO: mostra apenas do cost_center do usuário
CREATE POLICY "RLS Expenses Policy"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id() AND
  (
    -- Se for family, mostrar tudo
    get_user_org_type() = 'family' OR
    -- Se for solo, mostrar apenas do cost_center do usuário
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
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'incomes' 
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON incomes', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "RLS Incomes Policy"
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
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'expense_splits' 
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON expense_splits', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "RLS Expense Splits Policy"
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
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'income_splits' 
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON income_splits', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "RLS Income Splits Policy"
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

-- Garantir que RLS está habilitado
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;

-- Mensagem final
SELECT 
  '✅ FIX APLICADO COM SUCESSO!' as status,
  'Políticas simplificadas criadas' as detalhe,
  'Recarregue o dashboard agora' as proximo_passo;

