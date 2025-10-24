-- ============================================
-- CRIAÇÃO DE TABELAS PARA CONTAS BANCÁRIAS
-- ============================================

-- 1. Tabela bank_accounts
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),
    account_number TEXT,
    initial_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('individual', 'shared')),
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE bank_accounts IS 'Contas bancárias (corrente/poupança)';
COMMENT ON COLUMN bank_accounts.account_type IS 'Tipo: checking (corrente) ou savings (poupança)';
COMMENT ON COLUMN bank_accounts.owner_type IS 'Propriedade: individual ou shared';
COMMENT ON COLUMN bank_accounts.current_balance IS 'Saldo calculado automaticamente';

-- Índices
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_cost_center ON bank_accounts(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);

-- 2. Tabela bank_account_transactions
-- ============================================
CREATE TABLE IF NOT EXISTS bank_account_transactions (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'manual_credit', 
        'manual_debit', 
        'expense_payment', 
        'bill_payment', 
        'income_deposit', 
        'transfer_in', 
        'transfer_out'
    )),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    expense_id BIGINT REFERENCES expenses(id) ON DELETE SET NULL,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    income_id UUID REFERENCES incomes(id) ON DELETE SET NULL,
    related_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE bank_account_transactions IS 'Histórico de todas as movimentações bancárias';
COMMENT ON COLUMN bank_account_transactions.transaction_type IS 'Tipo: manual, pagamento de despesa/conta, depósito de entrada, transferência';
COMMENT ON COLUMN bank_account_transactions.balance_after IS 'Saldo após esta transação';

-- Índices
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_account_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_account_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_account_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_expense ON bank_account_transactions(expense_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bill ON bank_account_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_income ON bank_account_transactions(income_id);

-- 3. Tabela bank_account_shares
-- ============================================
CREATE TABLE IF NOT EXISTS bank_account_shares (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    UNIQUE(bank_account_id, cost_center_id)
);

COMMENT ON TABLE bank_account_shares IS 'Participação de cada centro de custo em contas compartilhadas';
COMMENT ON COLUMN bank_account_shares.percentage IS 'Percentual de participação (soma deve ser 100%)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_bank_shares_account ON bank_account_shares(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_shares_cost_center ON bank_account_shares(cost_center_id);

-- 4. Adicionar coluna bank_account_id nas tabelas existentes
-- ============================================

-- expenses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'bank_account_id') THEN
        ALTER TABLE expenses ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_expenses_bank_account ON expenses(bank_account_id);
    END IF;
END
$$;

-- bills
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'bank_account_id') THEN
        ALTER TABLE bills ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_bills_bank_account ON bills(bank_account_id);
    END IF;
END
$$;

-- incomes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'bank_account_id') THEN
        ALTER TABLE incomes ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_incomes_bank_account ON incomes(bank_account_id);
    END IF;
END
$$;

-- 5. Função para atualizar saldo automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_account_id UUID;
    v_new_balance DECIMAL(10,2);
BEGIN
    -- Determinar account_id dependendo da operação
    IF TG_OP = 'DELETE' THEN
        v_account_id := OLD.bank_account_id;
    ELSE
        v_account_id := NEW.bank_account_id;
    END IF;

    -- Recalcular saldo atual baseado em todas as transações
    SELECT COALESCE(initial_balance, 0) + COALESCE(SUM(
        CASE 
            WHEN transaction_type IN ('manual_credit', 'income_deposit', 'transfer_in') THEN amount
            WHEN transaction_type IN ('manual_debit', 'expense_payment', 'bill_payment', 'transfer_out') THEN -amount
            ELSE 0
        END
    ), 0)
    INTO v_new_balance
    FROM bank_accounts ba
    LEFT JOIN bank_account_transactions bat ON bat.bank_account_id = ba.id
    WHERE ba.id = v_account_id;

    -- Atualizar saldo na conta
    UPDATE bank_accounts
    SET current_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = v_account_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar saldo após transações
DROP TRIGGER IF EXISTS trigger_update_bank_balance ON bank_account_transactions;
CREATE TRIGGER trigger_update_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON bank_account_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_account_balance();

-- 6. Função RPC para criar transação bancária
-- ============================================
CREATE OR REPLACE FUNCTION create_bank_transaction(
    p_bank_account_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL,
    p_description TEXT,
    p_date DATE,
    p_expense_id BIGINT DEFAULT NULL,
    p_bill_id UUID DEFAULT NULL,
    p_income_id UUID DEFAULT NULL,
    p_related_account_id UUID DEFAULT NULL,
    p_organization_id UUID,
    p_user_id UUID
) RETURNS BIGINT AS $$
DECLARE
    v_current_balance DECIMAL(10,2);
    v_new_balance DECIMAL(10,2);
    v_transaction_id BIGINT;
    v_account_type TEXT;
BEGIN
    -- Buscar saldo atual da conta
    SELECT current_balance, account_type
    INTO v_current_balance, v_account_type
    FROM bank_accounts
    WHERE id = p_bank_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conta bancária não encontrada';
    END IF;

    -- Validar saldo suficiente para débitos
    IF p_transaction_type IN ('manual_debit', 'expense_payment', 'bill_payment', 'transfer_out') THEN
        IF v_current_balance < p_amount THEN
            RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: %', v_current_balance;
        END IF;
    END IF;

    -- Calcular novo saldo
    IF p_transaction_type IN ('manual_credit', 'income_deposit', 'transfer_in') THEN
        v_new_balance := v_current_balance + p_amount;
    ELSE
        v_new_balance := v_current_balance - p_amount;
    END IF;

    -- Inserir transação
    INSERT INTO bank_account_transactions (
        bank_account_id,
        transaction_type,
        amount,
        description,
        date,
        balance_after,
        expense_id,
        bill_id,
        income_id,
        related_account_id,
        organization_id,
        user_id
    ) VALUES (
        p_bank_account_id,
        p_transaction_type,
        p_amount,
        p_description,
        p_date,
        v_new_balance,
        p_expense_id,
        p_bill_id,
        p_income_id,
        p_related_account_id,
        p_organization_id,
        p_user_id
    ) RETURNING id INTO v_transaction_id;

    -- O trigger vai atualizar o saldo automaticamente
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Função RPC para transferência entre contas
-- ============================================
CREATE OR REPLACE FUNCTION transfer_between_accounts(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount DECIMAL,
    p_description TEXT,
    p_date DATE,
    p_organization_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_debit_transaction_id BIGINT;
    v_credit_transaction_id BIGINT;
BEGIN
    -- Criar transação de débito na conta origem
    v_debit_transaction_id := create_bank_transaction(
        p_from_account_id,
        'transfer_out',
        p_amount,
        p_description || ' → Transferência para outra conta',
        p_date,
        NULL, -- expense_id
        NULL, -- bill_id
        NULL, -- income_id
        p_to_account_id, -- related_account_id
        p_organization_id,
        p_user_id
    );

    -- Criar transação de crédito na conta destino
    v_credit_transaction_id := create_bank_transaction(
        p_to_account_id,
        'transfer_in',
        p_amount,
        p_description || ' ← Transferência de outra conta',
        p_date,
        NULL, -- expense_id
        NULL, -- bill_id
        NULL, -- income_id
        p_from_account_id, -- related_account_id
        p_organization_id,
        p_user_id
    );

    RETURN jsonb_build_object(
        'debit_transaction_id', v_debit_transaction_id,
        'credit_transaction_id', v_credit_transaction_id
    );
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies
-- ============================================

-- Habilitar RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_account_shares ENABLE ROW LEVEL SECURITY;

-- Policies para bank_accounts
CREATE POLICY "Users can view bank accounts from their organization"
    ON bank_accounts FOR SELECT
    USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_accounts.organization_id));

CREATE POLICY "Users can insert bank accounts in their organization"
    ON bank_accounts FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_accounts.organization_id));

CREATE POLICY "Users can update bank accounts in their organization"
    ON bank_accounts FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_accounts.organization_id));

CREATE POLICY "Users can delete bank accounts in their organization"
    ON bank_accounts FOR DELETE
    USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_accounts.organization_id));

-- Policies para bank_account_transactions
CREATE POLICY "Users can view transactions from their organization"
    ON bank_account_transactions FOR SELECT
    USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_account_transactions.organization_id));

CREATE POLICY "Users can insert transactions in their organization"
    ON bank_account_transactions FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_account_transactions.organization_id));

CREATE POLICY "Users can update transactions in their organization"
    ON bank_account_transactions FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_account_transactions.organization_id));

CREATE POLICY "Users can delete transactions in their organization"
    ON bank_account_transactions FOR DELETE
    USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bank_account_transactions.organization_id));

-- Policies para bank_account_shares
CREATE POLICY "Users can view shares from their organization"
    ON bank_account_shares FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM users 
        WHERE organization_id IN (
            SELECT organization_id FROM bank_accounts WHERE id = bank_account_shares.bank_account_id
        )
    ));

CREATE POLICY "Users can insert shares in their organization"
    ON bank_account_shares FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM users 
        WHERE organization_id IN (
            SELECT organization_id FROM bank_accounts WHERE id = bank_account_shares.bank_account_id
        )
    ));

CREATE POLICY "Users can update shares in their organization"
    ON bank_account_shares FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM users 
        WHERE organization_id IN (
            SELECT organization_id FROM bank_accounts WHERE id = bank_account_shares.bank_account_id
        )
    ));

CREATE POLICY "Users can delete shares in their organization"
    ON bank_account_shares FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM users 
        WHERE organization_id IN (
            SELECT organization_id FROM bank_accounts WHERE id = bank_account_shares.bank_account_id
        )
    ));

