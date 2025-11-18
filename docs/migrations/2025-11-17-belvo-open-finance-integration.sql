-- ============================================================================
-- Migration: Belvo Open Finance Integration
-- Data: 17/11/2025
-- Descrição: Integração completa com Belvo para Open Banking
-- ============================================================================

-- ============================================================================
-- 1. NOVA TABELA: belvo_links
-- Armazena conexões/links Belvo por organização
-- ============================================================================
CREATE TABLE IF NOT EXISTS belvo_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    link_id TEXT NOT NULL UNIQUE,
    institution_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending_sync', 'synced', 'expired', 'error')) DEFAULT 'pending_sync',
    consent_expiration TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE belvo_links IS 'Links/conexões Belvo por organização';
COMMENT ON COLUMN belvo_links.link_id IS 'ID do link no Belvo (único)';
COMMENT ON COLUMN belvo_links.status IS 'Status: pending_sync, synced, expired, error';

CREATE INDEX IF NOT EXISTS idx_belvo_links_org ON belvo_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_belvo_links_user ON belvo_links(user_id);
CREATE INDEX IF NOT EXISTS idx_belvo_links_link_id ON belvo_links(link_id);

-- ============================================================================
-- 2. NOVA TABELA: belvo_webhooks_processed
-- Garante idempotência no processamento de webhooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS belvo_webhooks_processed (
    webhook_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    link_id TEXT,
    payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE belvo_webhooks_processed IS 'Registro de webhooks Belvo processados (idempotência)';
COMMENT ON COLUMN belvo_webhooks_processed.webhook_id IS 'ID único do webhook Belvo';

CREATE INDEX IF NOT EXISTS idx_belvo_webhooks_event ON belvo_webhooks_processed(event_type);
CREATE INDEX IF NOT EXISTS idx_belvo_webhooks_link ON belvo_webhooks_processed(link_id);

-- ============================================================================
-- 3. NOVA TABELA: transfers
-- Transferências internas entre contas Belvo da mesma organização
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    from_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    to_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL,
    belvo_transaction_id TEXT UNIQUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE transfers IS 'Transferências internas entre contas Belvo';
COMMENT ON COLUMN transfers.belvo_transaction_id IS 'ID da transação Belvo (para deduplicação)';

CREATE INDEX IF NOT EXISTS idx_transfers_org ON transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date);

-- ============================================================================
-- 4. ESTENDER TABELA: bank_accounts
-- Adicionar campos Belvo
-- ============================================================================
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'belvo')),
ADD COLUMN IF NOT EXISTS belvo_link_id TEXT REFERENCES belvo_links(link_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS belvo_account_id TEXT,
ADD COLUMN IF NOT EXISTS manual_inputs_allowed BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN bank_accounts.provider IS 'Origem: manual ou belvo';
COMMENT ON COLUMN bank_accounts.belvo_link_id IS 'Link Belvo associado';
COMMENT ON COLUMN bank_accounts.belvo_account_id IS 'ID da conta no Belvo';
COMMENT ON COLUMN bank_accounts.manual_inputs_allowed IS 'Permite inputs manuais (false para contas Belvo)';

CREATE INDEX IF NOT EXISTS idx_bank_accounts_provider ON bank_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_belvo_link ON bank_accounts(belvo_link_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_belvo_account ON bank_accounts(belvo_account_id);

-- ============================================================================
-- 5. ESTENDER TABELA: cards
-- Adicionar campos Belvo
-- ============================================================================
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'belvo')),
ADD COLUMN IF NOT EXISTS belvo_link_id TEXT REFERENCES belvo_links(link_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS belvo_account_id TEXT,
ADD COLUMN IF NOT EXISTS manual_inputs_allowed BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS belvo_credit_limit NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS belvo_current_bill NUMERIC(14,2);

COMMENT ON COLUMN cards.provider IS 'Origem: manual ou belvo';
COMMENT ON COLUMN cards.belvo_link_id IS 'Link Belvo associado';
COMMENT ON COLUMN cards.belvo_account_id IS 'ID do cartão no Belvo';
COMMENT ON COLUMN cards.manual_inputs_allowed IS 'Permite inputs manuais (false para cartões Belvo)';
COMMENT ON COLUMN cards.belvo_credit_limit IS 'Limite de crédito informado pelo Belvo';
COMMENT ON COLUMN cards.belvo_current_bill IS 'Valor da fatura atual (Belvo)';

CREATE INDEX IF NOT EXISTS idx_cards_provider ON cards(provider);
CREATE INDEX IF NOT EXISTS idx_cards_belvo_link ON cards(belvo_link_id);
CREATE INDEX IF NOT EXISTS idx_cards_belvo_account ON cards(belvo_account_id);

-- ============================================================================
-- 6. ESTENDER TABELA: card_invoices (reuso da tabela existente)
-- Adicionar campos Belvo
-- ============================================================================
ALTER TABLE card_invoices
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual' CHECK (provider IN ('manual', 'belvo')),
ADD COLUMN IF NOT EXISTS belvo_bill_id TEXT UNIQUE;

COMMENT ON COLUMN card_invoices.provider IS 'Origem: manual ou belvo';
COMMENT ON COLUMN card_invoices.belvo_bill_id IS 'ID da fatura no Belvo (único)';

CREATE INDEX IF NOT EXISTS idx_card_invoices_provider ON card_invoices(provider);
CREATE INDEX IF NOT EXISTS idx_card_invoices_belvo_bill ON card_invoices(belvo_bill_id);

-- ============================================================================
-- 7. ESTENDER TABELA: expenses
-- Adicionar campos Belvo para deduplicação e classificação
-- ============================================================================
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS belvo_transaction_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS belvo_account_id TEXT,
ADD COLUMN IF NOT EXISTS transaction_channel TEXT,
ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN expenses.belvo_transaction_id IS 'ID da transação Belvo (único, para deduplicação)';
COMMENT ON COLUMN expenses.belvo_account_id IS 'ID da conta Belvo de origem';
COMMENT ON COLUMN expenses.transaction_channel IS 'Canal da transação (online, atm, pos, etc)';
COMMENT ON COLUMN expenses.is_transfer IS 'Indica se é uma transferência';

CREATE INDEX IF NOT EXISTS idx_expenses_belvo_transaction ON expenses(belvo_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_belvo_account ON expenses(belvo_account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_transfer ON expenses(is_transfer);

-- ============================================================================
-- 8. ESTENDER TABELA: incomes
-- Adicionar campos Belvo
-- ============================================================================
ALTER TABLE incomes
ADD COLUMN IF NOT EXISTS belvo_transaction_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS belvo_account_id TEXT;

COMMENT ON COLUMN incomes.belvo_transaction_id IS 'ID da transação Belvo (único, para deduplicação)';
COMMENT ON COLUMN incomes.belvo_account_id IS 'ID da conta Belvo de destino';

CREATE INDEX IF NOT EXISTS idx_incomes_belvo_transaction ON incomes(belvo_transaction_id);
CREATE INDEX IF NOT EXISTS idx_incomes_belvo_account ON incomes(belvo_account_id);

-- ============================================================================
-- 9. TRIGGER: Atualizar updated_at em belvo_links
-- ============================================================================
CREATE OR REPLACE FUNCTION update_belvo_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_belvo_links_updated_at ON belvo_links;
CREATE TRIGGER trigger_belvo_links_updated_at
    BEFORE UPDATE ON belvo_links
    FOR EACH ROW
    EXECUTE FUNCTION update_belvo_links_updated_at();

-- ============================================================================
-- 10. FUNÇÃO: Verificar se conta permite inputs manuais
-- ============================================================================
CREATE OR REPLACE FUNCTION check_manual_inputs_allowed(
    p_account_type TEXT,
    p_account_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_allowed BOOLEAN;
BEGIN
    IF p_account_type = 'bank_account' THEN
        SELECT manual_inputs_allowed INTO v_allowed
        FROM bank_accounts
        WHERE id = p_account_id;
    ELSIF p_account_type = 'card' THEN
        SELECT manual_inputs_allowed INTO v_allowed
        FROM cards
        WHERE id = p_account_id;
    ELSE
        RETURN true; -- Se não é conta/cartão, permite
    END IF;
    
    RETURN COALESCE(v_allowed, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_manual_inputs_allowed(TEXT, UUID) 
IS 'Verifica se conta/cartão permite inputs manuais (false para Belvo)';

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

