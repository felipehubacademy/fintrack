-- ============================================================================
-- SOLUÇÃO COMPLETA: RLS para queries com joins
-- ============================================================================
-- PROBLEMA IDENTIFICADO:
-- 1. Frontend faz queries com joins: expense_splits, cost_centers, budget_categories
-- 2. Quando PostgREST resolve joins, cada tabela precisa ter RLS que permita acesso
-- 3. Se expense_splits ou cost_centers estão bloqueados, mesmo expenses liberados não aparecem
-- 
-- SOLUÇÃO:
-- 1. Política SIMPLES para expenses (apenas verifica organization_id)
-- 2. Políticas PERMISSIVAS para expense_splits, cost_centers, budget_categories
-- 3. Usar EXISTS direto (sem funções helper que podem falhar em contexto RLS)
-- ============================================================================

-- PARTE 1: Remover TODAS as políticas SELECT existentes
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Expenses
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON expenses', r.policyname);
  END LOOP;
  
  -- Incomes
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incomes' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON incomes', r.policyname);
  END LOOP;
  
  -- Expense splits
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expense_splits' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON expense_splits', r.policyname);
  END LOOP;
  
  -- Income splits
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'income_splits' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON income_splits', r.policyname);
  END LOOP;
  
  -- Cost centers
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cost_centers' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON cost_centers', r.policyname);
  END LOOP;
  
  -- Budget categories
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'budget_categories' AND cmd = 'SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON budget_categories', r.policyname);
  END LOOP;
END $$;

-- PARTE 2: Criar políticas SIMPLES e DIRETAS
-- ============================================================================

-- EXPENSES: Apenas verifica se organization_id corresponde ao usuário
CREATE POLICY "expenses_select"
ON expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = expenses.organization_id
    AND users.is_active = true
  )
);

-- INCOMES: Mesma lógica
CREATE POLICY "incomes_select"
ON incomes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = incomes.organization_id
    AND users.is_active = true
  )
);

-- EXPENSE_SPLITS: Via expense (se expense é acessível, splits são acessíveis)
CREATE POLICY "expense_splits_select"
ON expense_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    JOIN users ON users.organization_id = expenses.organization_id
    WHERE expenses.id = expense_splits.expense_id
    AND users.id = auth.uid()
    AND users.is_active = true
  )
);

-- INCOME_SPLITS: Via income
CREATE POLICY "income_splits_select"
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    JOIN users ON users.organization_id = incomes.organization_id
    WHERE incomes.id = income_splits.income_id
    AND users.id = auth.uid()
    AND users.is_active = true
  )
);

-- COST_CENTERS: Permitir ver todos da organização (necessário para joins)
CREATE POLICY "cost_centers_select"
ON cost_centers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = cost_centers.organization_id
    AND users.is_active = true
  )
);

-- BUDGET_CATEGORIES: Permitir ver da organização OU globais (organization_id IS NULL)
CREATE POLICY "budget_categories_select"
ON budget_categories
FOR SELECT
TO authenticated
USING (
  budget_categories.organization_id IS NULL OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = budget_categories.organization_id
    AND users.is_active = true
  )
);

-- PARTE 3: Garantir RLS habilitado
-- ============================================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- PARTE 4: Verificar se políticas foram criadas
-- ============================================================================

SELECT 
  'Políticas criadas' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('expenses', 'incomes', 'expense_splits', 'income_splits', 'cost_centers', 'budget_categories')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- PARTE 5: Teste final - simular query do frontend
-- ============================================================================

-- Teste 1: Expenses simples
SELECT 
  'Teste 1: Expenses visíveis' as teste,
  COUNT(*)::text as total
FROM expenses;

-- Teste 2: Expenses com join expense_splits (como frontend faz)
SELECT 
  'Teste 2: Expenses com expense_splits' as teste,
  COUNT(DISTINCT expenses.id)::text as expenses_com_splits
FROM expenses
LEFT JOIN expense_splits ON expense_splits.expense_id = expenses.id;

SELECT '✅ SOLUÇÃO APLICADA - Recarregue dashboard e teste' as resultado;

