-- ============================================================================
-- RLS Policies: Tabelas Financeiras
-- Controla acesso a expenses, incomes, bills, cards, budgets, etc.
-- ============================================================================

-- ============================================================================
-- EXPENSES
-- ============================================================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- SELECT: Dados da própria organização
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
CREATE POLICY "Users can view expenses from their organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  user_belongs_to_org(organization_id)
);

-- INSERT: Criar despesa na própria organização com próprio user_id
DROP POLICY IF EXISTS "Users can insert expenses in their organization" ON expenses;
CREATE POLICY "Users can insert expenses in their organization"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  user_id = get_current_user_id()
);

-- UPDATE: Atualizar despesas da própria organização
DROP POLICY IF EXISTS "Users can update expenses in their organization" ON expenses;
CREATE POLICY "Users can update expenses in their organization"
ON expenses
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

-- DELETE: Deletar despesas da própria organização
DROP POLICY IF EXISTS "Users can delete expenses in their organization" ON expenses;
CREATE POLICY "Users can delete expenses in their organization"
ON expenses
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- EXPENSE_SPLITS
-- ============================================================================
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- SELECT: Via expense (que já está protegido)
DROP POLICY IF EXISTS "Users can view expense splits from their organization" ON expense_splits;
CREATE POLICY "Users can view expense splits from their organization"
ON expense_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND user_belongs_to_org(expenses.organization_id)
  )
);

-- INSERT: Validar que expense pertence à organização
DROP POLICY IF EXISTS "Users can insert expense splits for their organization" ON expense_splits;
CREATE POLICY "Users can insert expense splits for their organization"
ON expense_splits
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND user_belongs_to_org(expenses.organization_id)
  )
);

-- UPDATE: Validar que expense pertence à organização
DROP POLICY IF EXISTS "Users can update expense splits for their organization" ON expense_splits;
CREATE POLICY "Users can update expense splits for their organization"
ON expense_splits
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND user_belongs_to_org(expenses.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND user_belongs_to_org(expenses.organization_id)
  )
);

-- DELETE: Validar que expense pertence à organização
DROP POLICY IF EXISTS "Users can delete expense splits for their organization" ON expense_splits;
CREATE POLICY "Users can delete expense splits for their organization"
ON expense_splits
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM expenses
    WHERE expenses.id = expense_splits.expense_id
    AND user_belongs_to_org(expenses.organization_id)
  )
);

-- ============================================================================
-- INCOMES
-- ============================================================================
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- SELECT: Dados da própria organização
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;
CREATE POLICY "Users can view incomes from their organization"
ON incomes
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

-- INSERT: Criar entrada na própria organização com próprio user_id
DROP POLICY IF EXISTS "Users can insert incomes in their organization" ON incomes;
CREATE POLICY "Users can insert incomes in their organization"
ON incomes
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  user_id = get_current_user_id()
);

-- UPDATE: Atualizar entradas da própria organização
DROP POLICY IF EXISTS "Users can update incomes in their organization" ON incomes;
CREATE POLICY "Users can update incomes in their organization"
ON incomes
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

-- DELETE: Deletar entradas da própria organização
DROP POLICY IF EXISTS "Users can delete incomes in their organization" ON incomes;
CREATE POLICY "Users can delete incomes in their organization"
ON incomes
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- INCOME_SPLITS
-- ============================================================================
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;

-- SELECT: Via income (que já está protegido)
DROP POLICY IF EXISTS "Users can view income splits from their organization" ON income_splits;
CREATE POLICY "Users can view income splits from their organization"
ON income_splits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND user_belongs_to_org(incomes.organization_id)
  )
);

-- INSERT/UPDATE/DELETE: Validar que income pertence à organização
DROP POLICY IF EXISTS "Users can insert income splits for their organization" ON income_splits;
CREATE POLICY "Users can insert income splits for their organization"
ON income_splits
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND user_belongs_to_org(incomes.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can update income splits for their organization" ON income_splits;
CREATE POLICY "Users can update income splits for their organization"
ON income_splits
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND user_belongs_to_org(incomes.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND user_belongs_to_org(incomes.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can delete income splits for their organization" ON income_splits;
CREATE POLICY "Users can delete income splits for their organization"
ON income_splits
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM incomes
    WHERE incomes.id = income_splits.income_id
    AND user_belongs_to_org(incomes.organization_id)
  )
);

-- ============================================================================
-- BILLS
-- ============================================================================
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bills from their organization" ON bills;
CREATE POLICY "Users can view bills from their organization"
ON bills
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can insert bills in their organization" ON bills;
CREATE POLICY "Users can insert bills in their organization"
ON bills
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  user_id = get_current_user_id()
);

DROP POLICY IF EXISTS "Users can update bills in their organization" ON bills;
CREATE POLICY "Users can update bills in their organization"
ON bills
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can delete bills in their organization" ON bills;
CREATE POLICY "Users can delete bills in their organization"
ON bills
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- CARDS
-- ============================================================================
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cards from their organization" ON cards;
CREATE POLICY "Users can view cards from their organization"
ON cards
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can insert cards in their organization" ON cards;
CREATE POLICY "Users can insert cards in their organization"
ON cards
FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can update cards in their organization" ON cards;
CREATE POLICY "Users can update cards in their organization"
ON cards
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can delete cards in their organization" ON cards;
CREATE POLICY "Users can delete cards in their organization"
ON cards
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- BUDGETS
-- ============================================================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view budgets from their organization" ON budgets;
CREATE POLICY "Users can view budgets from their organization"
ON budgets
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can insert budgets in their organization" ON budgets;
CREATE POLICY "Users can insert budgets in their organization"
ON budgets
FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can update budgets in their organization" ON budgets;
CREATE POLICY "Users can update budgets in their organization"
ON budgets
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can delete budgets in their organization" ON budgets;
CREATE POLICY "Users can delete budgets in their organization"
ON budgets
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- BUDGET_CATEGORIES (especial: suporta categories globais com organization_id NULL)
-- ============================================================================
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- SELECT: Categorias da organização OU globais (organization_id IS NULL)
DROP POLICY IF EXISTS "Users can view categories from their organization or global" ON budget_categories;
CREATE POLICY "Users can view categories from their organization or global"
ON budget_categories
FOR SELECT
TO authenticated
USING (
  -- Categorias da própria organização OU
  user_belongs_to_org(organization_id) OR
  -- Categorias globais (organization_id IS NULL)
  organization_id IS NULL
);

-- INSERT: Apenas categorias da própria organização (não permitir criar globais via RLS)
DROP POLICY IF EXISTS "Users can insert categories in their organization" ON budget_categories;
CREATE POLICY "Users can insert categories in their organization"
ON budget_categories
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL AND
  user_belongs_to_org(organization_id)
);

-- UPDATE: Apenas categorias da própria organização (não permitir atualizar globais via RLS)
DROP POLICY IF EXISTS "Users can update categories in their organization" ON budget_categories;
CREATE POLICY "Users can update categories in their organization"
ON budget_categories
FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL AND
  user_belongs_to_org(organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL AND
  user_belongs_to_org(organization_id)
);

-- DELETE: Apenas categorias da própria organização
DROP POLICY IF EXISTS "Users can delete categories in their organization" ON budget_categories;
CREATE POLICY "Users can delete categories in their organization"
ON budget_categories
FOR DELETE
TO authenticated
USING (
  organization_id IS NOT NULL AND
  user_belongs_to_org(organization_id)
);

-- ============================================================================
-- COST_CENTERS
-- ============================================================================
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cost centers from their organization" ON cost_centers;
CREATE POLICY "Users can view cost centers from their organization"
ON cost_centers
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can insert cost centers in their organization" ON cost_centers;
CREATE POLICY "Users can insert cost centers in their organization"
ON cost_centers
FOR INSERT
TO authenticated
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can update cost centers in their organization" ON cost_centers;
CREATE POLICY "Users can update cost centers in their organization"
ON cost_centers
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can delete cost centers in their organization" ON cost_centers;
CREATE POLICY "Users can delete cost centers in their organization"
ON cost_centers
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- BANK_ACCOUNTS
-- ============================================================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bank accounts from their organization" ON bank_accounts;
CREATE POLICY "Users can view bank accounts from their organization"
ON bank_accounts
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can insert bank accounts in their organization" ON bank_accounts;
CREATE POLICY "Users can insert bank accounts in their organization"
ON bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  (user_id = auth.uid() OR user_id = get_current_user_id())
);

DROP POLICY IF EXISTS "Users can update bank accounts in their organization" ON bank_accounts;
CREATE POLICY "Users can update bank accounts in their organization"
ON bank_accounts
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can delete bank accounts in their organization" ON bank_accounts;
CREATE POLICY "Users can delete bank accounts in their organization"
ON bank_accounts
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- BANK_ACCOUNT_TRANSACTIONS
-- ============================================================================
ALTER TABLE bank_account_transactions ENABLE ROW LEVEL SECURITY;

-- SELECT: Via bank_account (que já está protegido)
DROP POLICY IF EXISTS "Users can view bank transactions from their organization" ON bank_account_transactions;
CREATE POLICY "Users can view bank transactions from their organization"
ON bank_account_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_transactions.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

-- INSERT/UPDATE/DELETE: Validar via bank_account
DROP POLICY IF EXISTS "Users can insert bank transactions for their organization" ON bank_account_transactions;
CREATE POLICY "Users can insert bank transactions for their organization"
ON bank_account_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  (user_id = auth.uid() OR user_id = get_current_user_id()) AND
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_transactions.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can update bank transactions for their organization" ON bank_account_transactions;
CREATE POLICY "Users can update bank transactions for their organization"
ON bank_account_transactions
FOR UPDATE
TO authenticated
USING (
  user_belongs_to_org(organization_id) AND
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_transactions.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
)
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_transactions.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can delete bank transactions for their organization" ON bank_account_transactions;
CREATE POLICY "Users can delete bank transactions for their organization"
ON bank_account_transactions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_transactions.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

-- ============================================================================
-- BANK_ACCOUNT_SHARES
-- ============================================================================
ALTER TABLE bank_account_shares ENABLE ROW LEVEL SECURITY;

-- SELECT: Via bank_account
DROP POLICY IF EXISTS "Users can view bank account shares from their organization" ON bank_account_shares;
CREATE POLICY "Users can view bank account shares from their organization"
ON bank_account_shares
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_shares.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

-- INSERT/UPDATE/DELETE: Validar via bank_account
DROP POLICY IF EXISTS "Users can insert bank account shares for their organization" ON bank_account_shares;
CREATE POLICY "Users can insert bank account shares for their organization"
ON bank_account_shares
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_shares.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can update bank account shares for their organization" ON bank_account_shares;
CREATE POLICY "Users can update bank account shares for their organization"
ON bank_account_shares
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_shares.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_shares.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can delete bank account shares for their organization" ON bank_account_shares;
CREATE POLICY "Users can delete bank account shares for their organization"
ON bank_account_shares
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bank_accounts
    WHERE bank_accounts.id = bank_account_shares.bank_account_id
    AND user_belongs_to_org(bank_accounts.organization_id)
  )
);

-- ============================================================================
-- INVESTMENT_GOALS
-- ============================================================================
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view investment goals from their organization" ON investment_goals;
CREATE POLICY "Users can view investment goals from their organization"
ON investment_goals
FOR SELECT
TO authenticated
USING (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can insert investment goals in their organization" ON investment_goals;
CREATE POLICY "Users can insert investment goals in their organization"
ON investment_goals
FOR INSERT
TO authenticated
WITH CHECK (
  user_belongs_to_org(organization_id) AND
  user_id = get_current_user_id()
);

DROP POLICY IF EXISTS "Users can update investment goals in their organization" ON investment_goals;
CREATE POLICY "Users can update investment goals in their organization"
ON investment_goals
FOR UPDATE
TO authenticated
USING (user_belongs_to_org(organization_id))
WITH CHECK (user_belongs_to_org(organization_id));

DROP POLICY IF EXISTS "Users can delete investment goals in their organization" ON investment_goals;
CREATE POLICY "Users can delete investment goals in their organization"
ON investment_goals
FOR DELETE
TO authenticated
USING (user_belongs_to_org(organization_id));

-- ============================================================================
-- INVESTMENT_CONTRIBUTIONS
-- ============================================================================
ALTER TABLE investment_contributions ENABLE ROW LEVEL SECURITY;

-- SELECT: Via investment_goal
DROP POLICY IF EXISTS "Users can view investment contributions from their organization" ON investment_contributions;
CREATE POLICY "Users can view investment contributions from their organization"
ON investment_contributions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investment_goals
    WHERE investment_goals.id = investment_contributions.goal_id
    AND user_belongs_to_org(investment_goals.organization_id)
  )
);

-- INSERT/UPDATE/DELETE: Validar via investment_goal
DROP POLICY IF EXISTS "Users can insert investment contributions for their organization" ON investment_contributions;
CREATE POLICY "Users can insert investment contributions for their organization"
ON investment_contributions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM investment_goals
    WHERE investment_goals.id = investment_contributions.goal_id
    AND user_belongs_to_org(investment_goals.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can update investment contributions for their organization" ON investment_contributions;
CREATE POLICY "Users can update investment contributions for their organization"
ON investment_contributions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investment_goals
    WHERE investment_goals.id = investment_contributions.goal_id
    AND user_belongs_to_org(investment_goals.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM investment_goals
    WHERE investment_goals.id = investment_contributions.goal_id
    AND user_belongs_to_org(investment_goals.organization_id)
  )
);

DROP POLICY IF EXISTS "Users can delete investment contributions for their organization" ON investment_contributions;
CREATE POLICY "Users can delete investment contributions for their organization"
ON investment_contributions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM investment_goals
    WHERE investment_goals.id = investment_contributions.goal_id
    AND user_belongs_to_org(investment_goals.organization_id)
  )
);

