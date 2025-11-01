-- ============================================================================
-- RLS Rollback Script
-- Desabilita RLS em todas as tabelas (use apenas em emergência ou testes)
-- ============================================================================
-- ⚠️ ATENÇÃO: Este script desabilita TODAS as policies de RLS
-- Use apenas para testes ou em caso de emergência
-- ============================================================================

-- Desabilitar RLS em todas as tabelas principais
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE investment_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_tours DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Remover todas as policies (opcional - descomente se necessário)
-- CUIDADO: Isso remove todas as policies permanentemente
/*
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Removida policy: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;
*/

-- Verificar status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'organizations', 'users', 'expenses', 'expense_splits',
  'incomes', 'income_splits', 'bills', 'cards', 'budgets',
  'budget_categories', 'cost_centers', 'bank_accounts',
  'bank_account_shares', 'bank_account_transactions',
  'investment_goals', 'investment_contributions',
  'pending_invites', 'verification_codes', 'notifications',
  'notification_history', 'notification_templates',
  'onboarding_progress', 'user_tours', 'user_preferences',
  'conversations'
)
ORDER BY tablename;

RAISE NOTICE '✅ RLS desabilitado em todas as tabelas';
RAISE NOTICE '⚠️  Sistema está agora SEM proteção RLS';
RAISE NOTICE '';
RAISE NOTICE 'Para reabilitar, execute os scripts na ordem:';
RAISE NOTICE '1. 01-create-helper-functions.sql';
RAISE NOTICE '2. 02-organizations-policies.sql';
RAISE NOTICE '3. 03-users-policies.sql';
RAISE NOTICE '4. 04-financial-tables-policies.sql';
RAISE NOTICE '5. 05-system-tables-policies.sql';

