-- ============================================================================
-- Migration: Simplify RLS policies for incomes/income_splits
-- Date: 25/11/2025
-- Descrição: Usuários não estavam vendo entradas porque a política exigia
--            cost_center_id válido (solo) / splits já resolvidos. Ajustamos
--            para permitir qualquer usuário autenticado acessar todas as
--            entradas da própria organização, mantendo isolamento entre orgs.
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas de incomes (qualquer nome)
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

-- Criar política simples: qualquer usuário autenticado só enxerga incomes da própria organização
CREATE POLICY incomes_select_same_org
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

-- Remover políticas antigas de income_splits
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

-- Política para splits: seguir a organização do income pai
CREATE POLICY income_splits_select_same_org
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM incomes
    WHERE incomes.id = income_splits.income_id
      AND incomes.organization_id = get_user_organization_id()
  )
);

-- Confirmação
SELECT 
  '✅ Políticas de incomes atualizadas' AS status,
  now() AS applied_at;



