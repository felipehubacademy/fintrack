-- ============================================================================
-- Migração: Expandir tipos de conta para suportar mais categorias Belvo
-- Data: 2025-11-18
-- Descrição: Adiciona novos tipos de conta para previdência, investimentos e empréstimos
-- ============================================================================

-- 1. Adicionar novos tipos ao enum account_type
-- Nota: PostgreSQL não permite modificar enums diretamente, então precisamos criar um novo

-- Criar novo tipo com os valores expandidos
DO $$ 
BEGIN
    -- Verificar se o tipo já existe com os novos valores
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'account_type_enum'
        AND e.enumlabel = 'pension'
    ) THEN
        -- Adicionar novos valores ao enum existente
        ALTER TYPE account_type_enum ADD VALUE IF NOT EXISTS 'pension';
        ALTER TYPE account_type_enum ADD VALUE IF NOT EXISTS 'investment';
        ALTER TYPE account_type_enum ADD VALUE IF NOT EXISTS 'loan';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se o enum não existe como tipo nomeado, os valores estão inline na coluna
        -- Neste caso, precisamos alterar a constraint da coluna
        RAISE NOTICE 'Enum might be inline, attempting column constraint update...';
END $$;

-- 2. Se o constraint for inline (não um tipo enum nomeado), atualizar constraint
DO $$
BEGIN
    -- Remover constraint antiga se existir
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'bank_accounts_account_type_check'
    ) THEN
        ALTER TABLE bank_accounts DROP CONSTRAINT bank_accounts_account_type_check;
    END IF;
    
    -- Adicionar nova constraint com tipos expandidos
    ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_account_type_check 
        CHECK (account_type = ANY (ARRAY['checking'::text, 'savings'::text, 'pension'::text, 'investment'::text, 'loan'::text]));
    
    RAISE NOTICE 'Updated account_type constraint successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint might not exist or already updated: %', SQLERRM;
END $$;

-- 3. Comentários
COMMENT ON COLUMN bank_accounts.account_type IS 'Tipo de conta: checking (corrente), savings (poupança), pension (previdência/PGBL), investment (investimento), loan (empréstimo)';

-- 4. Exibir tipos atuais
DO $$
DECLARE
    account_types TEXT[];
BEGIN
    SELECT array_agg(DISTINCT account_type) INTO account_types FROM bank_accounts;
    RAISE NOTICE 'Current account types in use: %', account_types;
END $$;

-- ============================================================================
-- Notas:
-- - Tipos existentes: checking, savings
-- - Novos tipos: pension (previdência PGBL/VGBL), investment (investimentos), loan (empréstimos)
-- - Belvo retorna: CHECKING_ACCOUNT, SAVINGS_ACCOUNT, PENSION_FUND_ACCOUNT, LOAN_ACCOUNT
-- - Contas existentes não são afetadas (permanecem como checking/savings)
-- ============================================================================

