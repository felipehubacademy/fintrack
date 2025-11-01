-- ============================================================================
-- RLS Master Script - Aplicar Todas as Policies
-- Execute este script no SQL Editor do Supabase para habilitar RLS em todas as tabelas
-- ============================================================================
-- 
-- IMPORTANTE: Este script deve ser executado na ordem correta:
-- 1. Primeiro execute: 01-create-helper-functions.sql
-- 2. Depois execute: 02-organizations-policies.sql
-- 3. Depois execute: 03-users-policies.sql
-- 4. Depois execute: 04-financial-tables-policies.sql
-- 5. Depois execute: 05-system-tables-policies.sql
-- 6. Por fim, execute este script para verificar se tudo está aplicado
--
-- OU execute este arquivo que importa todos na ordem correta
-- ============================================================================

-- Verificar se as funções helper existem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_organization_id') THEN
    RAISE EXCEPTION 'Função get_user_organization_id não encontrada. Execute primeiro: 01-create-helper-functions.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'user_belongs_to_org') THEN
    RAISE EXCEPTION 'Função user_belongs_to_org não encontrada. Execute primeiro: 01-create-helper-functions.sql';
  END IF;
  
  RAISE NOTICE '✅ Funções helper verificadas';
END $$;

-- Lista de tabelas que devem ter RLS habilitado
DO $$
DECLARE
  tbl_name TEXT;
  tables_to_check TEXT[] := ARRAY[
    'organizations',
    'users',
    'expenses',
    'expense_splits',
    'incomes',
    'income_splits',
    'bills',
    'cards',
    'budgets',
    'budget_categories',
    'cost_centers',
    'bank_accounts',
    'bank_account_shares',
    'bank_account_transactions',
    'investment_goals',
    'investment_contributions',
    'pending_invites',
    'verification_codes',
    'notifications',
    'notification_history',
    'notification_templates',
    'onboarding_progress',
    'user_tours',
    'user_preferences',
    'conversations'
  ];
  rls_enabled BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🔍 Verificando status RLS das tabelas...';
  
  FOREACH tbl_name IN ARRAY tables_to_check
  LOOP
    -- Verificar se tabela existe e se RLS está habilitado
    SELECT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = tbl_name
    ), EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = tbl_name AND rowsecurity = true
    ) INTO table_exists, rls_enabled;
    
    IF NOT table_exists THEN
      RAISE NOTICE '⚠️  Tabela % não encontrada (pode não existir ainda)', tbl_name;
    ELSIF rls_enabled THEN
      RAISE NOTICE '✅ % - RLS habilitado', tbl_name;
    ELSE
      RAISE WARNING '❌ % - RLS DESABILITADO (precisa habilitar)', tbl_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Verificação concluída!';
  RAISE NOTICE '';
  RAISE NOTICE 'Se alguma tabela está com RLS desabilitado, verifique se:';
  RAISE NOTICE '1. Os scripts foram executados na ordem correta';
  RAISE NOTICE '2. Não houve erros durante a execução';
  RAISE NOTICE '3. A tabela existe no banco de dados';
END $$;

-- Contar policies criadas por tabela
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Mostrar resumo
DO $$
DECLARE
  tables_count INTEGER;
  policies_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT tablename) INTO tables_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '✅ Script de verificação concluído!';
  RAISE NOTICE '📊 Resumo: % tabelas com RLS, % policies criadas', tables_count, policies_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Para testar o RLS:';
  RAISE NOTICE '1. Faça login como um usuário';
  RAISE NOTICE '2. Tente acessar dados de outra organização (deve falhar)';
  RAISE NOTICE '3. Verifique se webhooks continuam funcionando (usam service role)';
END $$;

