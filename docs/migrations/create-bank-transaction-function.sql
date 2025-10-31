-- ============================================================================
-- Migration: Criar função create_bank_transaction
-- Data: 31/10/2025
-- Descrição: Cria a função RPC create_bank_transaction necessária para criar
--            transações bancárias e atualizar saldos automaticamente
-- ============================================================================

-- 1. Criar/Atualizar função de atualização de saldo (trigger)
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
    SELECT COALESCE(
        (SELECT initial_balance FROM bank_accounts WHERE id = v_account_id), 0
    ) + COALESCE(
        (SELECT SUM(
            CASE 
                WHEN transaction_type IN ('manual_credit', 'income_deposit', 'transfer_in') THEN amount
                WHEN transaction_type IN ('manual_debit', 'expense_payment', 'bill_payment', 'transfer_out') THEN -amount
                ELSE 0
            END
        ) FROM bank_account_transactions WHERE bank_account_id = v_account_id), 0
    )
    INTO v_new_balance;

    -- Atualizar saldo na conta
    UPDATE bank_accounts
    SET current_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = v_account_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger se não existir
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_bank_balance ON bank_account_transactions;
CREATE TRIGGER trigger_update_bank_balance
AFTER INSERT OR UPDATE OR DELETE ON bank_account_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_account_balance();

-- 3. Criar função RPC create_bank_transaction
-- ============================================
CREATE OR REPLACE FUNCTION create_bank_transaction(
    p_bank_account_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL,
    p_description TEXT,
    p_date DATE,
    p_organization_id UUID,
    p_user_id UUID,
    p_expense_id BIGINT DEFAULT NULL,
    p_bill_id UUID DEFAULT NULL,
    p_income_id UUID DEFAULT NULL,
    p_related_account_id UUID DEFAULT NULL
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

    -- Calcular novo saldo (permite saldo negativo)
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

-- Comentários de documentação
COMMENT ON FUNCTION create_bank_transaction IS 
'Função RPC para criar transações bancárias. Atualiza automaticamente o saldo da conta via trigger.
Tipos de transação suportados: manual_credit, manual_debit, expense_payment, bill_payment, 
income_deposit, transfer_in, transfer_out';

COMMENT ON FUNCTION update_bank_account_balance IS 
'Função de trigger que recalcula o saldo da conta bancária sempre que uma transação é criada, atualizada ou deletada.';

