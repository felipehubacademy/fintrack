-- ============================================
-- DESABILITAR RLS NAS TABELAS DE CONTAS BANCÁRIAS
-- ============================================

-- Desabilitar RLS nas tabelas de contas bancárias
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_shares DISABLE ROW LEVEL SECURITY;

-- Remover as policies existentes (opcional, mas recomendado)
DROP POLICY IF EXISTS "Users can view bank accounts from their organization" ON bank_accounts;
DROP POLICY IF EXISTS "Users can insert bank accounts in their organization" ON bank_accounts;
DROP POLICY IF EXISTS "Users can update bank accounts in their organization" ON bank_accounts;
DROP POLICY IF EXISTS "Users can delete bank accounts in their organization" ON bank_accounts;

DROP POLICY IF EXISTS "Users can view transactions from their organization" ON bank_account_transactions;
DROP POLICY IF EXISTS "Users can insert transactions in their organization" ON bank_account_transactions;
DROP POLICY IF EXISTS "Users can update transactions in their organization" ON bank_account_transactions;
DROP POLICY IF EXISTS "Users can delete transactions in their organization" ON bank_account_transactions;

DROP POLICY IF EXISTS "Users can view shares from their organization" ON bank_account_shares;
DROP POLICY IF EXISTS "Users can insert shares in their organization" ON bank_account_shares;
DROP POLICY IF EXISTS "Users can update shares in their organization" ON bank_account_shares;
DROP POLICY IF EXISTS "Users can delete shares in their organization" ON bank_account_shares;

