-- ============================================================================
-- Migration: Sistema de faturas e pagamentos de cartão de crédito
-- Data: 17/11/2025
-- Descrição:
--   1. Cria tabela card_invoices para armazenar metadados de faturas
--   2. Cria tabela card_invoice_payments para histórico de pagamentos
--   3. Adiciona flag pending_next_invoice em expenses
--   4. Cria função para calcular limite disponível do cartão
-- ============================================================================

-- 1. card_invoices ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    cycle_start_date DATE NOT NULL,
    cycle_end_date DATE NOT NULL,
    total_amount NUMERIC(14,2) NOT NULL,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'paid_partial')),
    first_payment_at TIMESTAMP WITH TIME ZONE,
    fully_paid_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(card_id, cycle_start_date)
);

COMMENT ON TABLE card_invoices IS 'Metadados de faturas de cartão (ciclos e pagamentos).';
COMMENT ON COLUMN card_invoices.total_amount IS 'Valor total calculado para o ciclo.';
COMMENT ON COLUMN card_invoices.paid_amount IS 'Somatório dos pagamentos registrados.';

CREATE INDEX IF NOT EXISTS idx_card_invoices_card ON card_invoices(card_id);
CREATE INDEX IF NOT EXISTS idx_card_invoices_org ON card_invoices(organization_id);

-- 2. card_invoice_payments ---------------------------------------------------
CREATE TABLE IF NOT EXISTS card_invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES card_invoices(id) ON DELETE CASCADE,
    bank_transaction_id BIGINT REFERENCES bank_account_transactions(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE card_invoice_payments IS 'Histórico de pagamentos das faturas de cartão.';
COMMENT ON COLUMN card_invoice_payments.bank_transaction_id IS 'Transação bancária que originou o pagamento (pode ser NULL para ajustes internos).';

CREATE INDEX IF NOT EXISTS idx_card_invoice_payments_invoice ON card_invoice_payments(invoice_id);

-- 3. Alterações em expenses --------------------------------------------------
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS pending_next_invoice BOOLEAN DEFAULT false;

COMMENT ON COLUMN expenses.pending_next_invoice IS 'Saldo transferido para próxima fatura (despesa fantasma).';

CREATE INDEX IF NOT EXISTS idx_expenses_pending_next_invoice
ON expenses(pending_next_invoice)
WHERE pending_next_invoice = true;

-- 4. Função para calcular limite disponível ----------------------------------
CREATE OR REPLACE FUNCTION calculate_card_available_limit(p_card_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_credit_limit NUMERIC(14,2);
    v_used_amount NUMERIC(14,2);
BEGIN
    SELECT credit_limit
    INTO v_credit_limit
    FROM cards
    WHERE id = p_card_id;

    IF v_credit_limit IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_used_amount
    FROM expenses
    WHERE card_id = p_card_id
      AND payment_method = 'credit_card'
      AND status = 'confirmed';

    RETURN GREATEST(0, COALESCE(v_credit_limit, 0) - v_used_amount);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_card_available_limit(UUID)
IS 'Calcula limite disponível considerando apenas despesas confirmadas do cartão.';

