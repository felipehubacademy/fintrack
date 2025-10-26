-- ============================================
-- LIMPAR BANCO PARA TESTES
-- ============================================
-- ATENÇÃO: Este script deleta TODOS os dados de teste
-- Use APENAS em ambiente de desenvolvimento

-- Ordem de exclusão (respeitando foreign keys)
-- 1. Começar pelas tabelas que são referenciadas (child tables)
-- 2. Depois as tabelas que referenciam outras (parent tables)

-- Tabelas de splits (referenciam expenses, incomes)
-- NOTA: bill_splits NÃO existe mais, pois contas a pagar compartilhadas usam expense_splits quando pagas
TRUNCATE TABLE expense_splits CASCADE;
TRUNCATE TABLE income_splits CASCADE;

-- Tabelas de transações (referenciam cost_centers, categories, users)
-- NOTA: Não há tabela installments separada, parcelas são expenses com installment_info
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE incomes CASCADE;
TRUNCATE TABLE bills CASCADE;

-- Tabelas de cartões e faturas
TRUNCATE TABLE cards CASCADE;

-- Tabelas de contas bancárias (se existirem)
DO $$ BEGIN
    TRUNCATE TABLE bank_account_transactions CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE bank_account_shares CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE bank_accounts CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Tabelas de orçamentos (se existirem)
DO $$ BEGIN
    TRUNCATE TABLE budgets CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Categorias são recriadas automaticamente no cadastro
-- Se quiser manter categorias, comente a linha abaixo
TRUNCATE TABLE budget_categories CASCADE;

-- Tabelas de investimentos (se existirem)
DO $$ BEGIN
    TRUNCATE TABLE investment_contributions CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE investment_goals CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Tabelas de convites
TRUNCATE TABLE pending_invites CASCADE;

-- Cost centers (referenciam users)
TRUNCATE TABLE cost_centers CASCADE;

-- Categorias de entrada (se existir)
DO $$ BEGIN
    TRUNCATE TABLE income_categories CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Usuários (referenciam organizations)
TRUNCATE TABLE users CASCADE;

-- Organizações
TRUNCATE TABLE organizations CASCADE;

-- Tabelas auxiliares (se existirem)
DO $$ BEGIN
    TRUNCATE TABLE notifications CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE notification_history CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE user_preferences CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE onboarding_progress CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    TRUNCATE TABLE user_tours CASCADE;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

-- Resetar sequências (se houver)
-- ALTER SEQUENCE IF EXISTS expenses_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- Verificar limpeza
SELECT 
  'expenses' as tabela, COUNT(*) as registros FROM expenses
UNION ALL
SELECT 'incomes', COUNT(*) FROM incomes
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'cost_centers', COUNT(*) FROM cost_centers
UNION ALL
SELECT 'cards', COUNT(*) FROM cards
UNION ALL
SELECT 'bills', COUNT(*) FROM bills
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets;

-- ============================================
-- BANCO LIMPO PARA TESTES
-- ============================================

