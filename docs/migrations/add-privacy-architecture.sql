-- ============================================
-- ADICIONAR ARQUITETURA DE PRIVACIDADE
-- ============================================
-- Adicionar campos is_shared para gerenciar privacidade individual vs organizacional

-- 1. Adicionar is_shared em cards
-- ============================================
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
COMMENT ON COLUMN cards.is_shared IS 'Se true, cartão é compartilhado com toda organização. Se false, é individual (privado)';

-- 2. Adicionar is_shared em budgets
-- ============================================
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
COMMENT ON COLUMN budgets.is_shared IS 'Se true, orçamento é compartilhado com toda organização. Se false, é individual (privado)';

-- 3. Renomear 'split' para 'is_shared' em expenses (se ainda não existe)
-- ============================================
-- Verificar se já existe is_shared
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'is_shared'
    ) THEN
        -- Se split existe, renomear para is_shared
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'expenses' AND column_name = 'split'
        ) THEN
            ALTER TABLE expenses RENAME COLUMN split TO is_shared;
        ELSE
            -- Criar nova coluna
            ALTER TABLE expenses ADD COLUMN is_shared BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

COMMENT ON COLUMN expenses.is_shared IS 'Se true, despesa é compartilhada com toda organização. Se false, é individual (privada)';

-- 4. Garantir que incomes tem is_shared
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incomes' AND column_name = 'is_shared'
    ) THEN
        ALTER TABLE incomes ADD COLUMN is_shared BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN incomes.is_shared IS 'Se true, entrada é compartilhada com toda organização. Se false, é individual (privada)';

-- 5. Adicionar is_shared em investment_goals (se a tabela existir)
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'investment_goals'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'investment_goals' AND column_name = 'is_shared'
        ) THEN
            ALTER TABLE investment_goals ADD COLUMN is_shared BOOLEAN DEFAULT false;
            COMMENT ON COLUMN investment_goals.is_shared IS 'Se true, meta de investimento é compartilhada. Se false, é individual (privada)';
        END IF;
    END IF;
END $$;

-- 6. Criar índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_is_shared ON expenses(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_is_shared ON incomes(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_cards_is_shared ON cards(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_budgets_is_shared ON budgets(is_shared, organization_id);

-- 7. Atualizar valores existentes
-- ============================================
-- Para despesas com expense_splits, marcar como is_shared = true
UPDATE expenses 
SET is_shared = true 
WHERE id IN (
    SELECT DISTINCT expense_id 
    FROM expense_splits
) AND (is_shared IS NULL OR is_shared = false);

-- Para receitas com income_splits, marcar como is_shared = true
UPDATE incomes 
SET is_shared = true 
WHERE id IN (
    SELECT DISTINCT income_id 
    FROM income_splits
) AND (is_shared IS NULL OR is_shared = false);

-- Para bills com bill_splits, marcar como is_shared = true (se a tabela bill_splits existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_splits'
    ) THEN
        UPDATE bills 
        SET is_shared = true 
        WHERE id IN (
            SELECT DISTINCT bill_id 
            FROM bill_splits
        ) AND (is_shared IS NULL OR is_shared = false);
    END IF;
END $$;

-- ============================================
-- CONCLUÍDO
-- ============================================
