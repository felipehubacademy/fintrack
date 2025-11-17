-- ============================================================================
-- BELVO OPEN FINANCE INTEGRATION
-- Migration to support hybrid mode: manual + Belvo-synced accounts/cards
-- ============================================================================

-- ============================================================================
-- 1. BELVO LINKS TABLE
-- Stores Belvo connection information per organization/user
-- ============================================================================
CREATE TABLE IF NOT EXISTS belvo_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    link_id TEXT NOT NULL UNIQUE, -- Belvo's link ID
    institution_name TEXT NOT NULL, -- Bank/institution name
    status TEXT NOT NULL DEFAULT 'pending_sync' CHECK (status IN ('pending_sync', 'synced', 'expired', 'error')),
    consent_expiration TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}', -- Additional Belvo metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_belvo_links_org ON belvo_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_belvo_links_user ON belvo_links(user_id);
CREATE INDEX IF NOT EXISTS idx_belvo_links_status ON belvo_links(status);
CREATE INDEX IF NOT EXISTS idx_belvo_links_link_id ON belvo_links(link_id);

-- ============================================================================
-- 2. EXTEND BANK_ACCOUNTS WITH BELVO FIELDS
-- ============================================================================
DO $$ 
BEGIN
  -- Provider: manual or belvo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'provider') THEN
    ALTER TABLE bank_accounts ADD COLUMN provider TEXT DEFAULT 'manual' CHECK (provider IN ('manual', 'belvo'));
  END IF;
  
  -- Belvo link ID reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'belvo_link_id') THEN
    ALTER TABLE bank_accounts ADD COLUMN belvo_link_id UUID REFERENCES belvo_links(id) ON DELETE SET NULL;
  END IF;
  
  -- Belvo account ID (unique identifier from Belvo)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'belvo_account_id') THEN
    ALTER TABLE bank_accounts ADD COLUMN belvo_account_id TEXT;
  END IF;
  
  -- Data source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'data_source') THEN
    ALTER TABLE bank_accounts ADD COLUMN data_source TEXT DEFAULT 'manual' CHECK (data_source IN ('manual', 'belvo'));
  END IF;
  
  -- Allow manual inputs (false for Belvo accounts)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_accounts' AND column_name = 'manual_inputs_allowed') THEN
    ALTER TABLE bank_accounts ADD COLUMN manual_inputs_allowed BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create unique index on belvo_account_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_belvo_account_id ON bank_accounts(belvo_account_id) WHERE belvo_account_id IS NOT NULL;

-- ============================================================================
-- 3. EXTEND CARDS WITH BELVO FIELDS
-- ============================================================================
DO $$ 
BEGIN
  -- Provider: manual or belvo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'provider') THEN
    ALTER TABLE cards ADD COLUMN provider TEXT DEFAULT 'manual' CHECK (provider IN ('manual', 'belvo'));
  END IF;
  
  -- Belvo link ID reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'belvo_link_id') THEN
    ALTER TABLE cards ADD COLUMN belvo_link_id UUID REFERENCES belvo_links(id) ON DELETE SET NULL;
  END IF;
  
  -- Belvo account ID (Belvo treats credit cards as accounts)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'belvo_account_id') THEN
    ALTER TABLE cards ADD COLUMN belvo_account_id TEXT;
  END IF;
  
  -- Data source
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'data_source') THEN
    ALTER TABLE cards ADD COLUMN data_source TEXT DEFAULT 'manual' CHECK (data_source IN ('manual', 'belvo'));
  END IF;
  
  -- Allow manual inputs (false for Belvo cards)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'manual_inputs_allowed') THEN
    ALTER TABLE cards ADD COLUMN manual_inputs_allowed BOOLEAN DEFAULT true;
  END IF;
  
  -- Belvo credit limit
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'belvo_credit_limit') THEN
    ALTER TABLE cards ADD COLUMN belvo_credit_limit DECIMAL(10,2);
  END IF;
  
  -- Current bill amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'current_bill_amount') THEN
    ALTER TABLE cards ADD COLUMN current_bill_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- Create unique index on belvo_account_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_belvo_account_id ON cards(belvo_account_id) WHERE belvo_account_id IS NOT NULL;

-- ============================================================================
-- 4. CREDIT CARD BILLS TABLE
-- Stores credit card bill cycles from Belvo
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_card_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    billing_cycle_start DATE NOT NULL,
    billing_cycle_end DATE NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'overdue')),
    belvo_bill_id TEXT UNIQUE, -- Belvo's bill/invoice ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_card ON credit_card_bills(card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_status ON credit_card_bills(status);
CREATE INDEX IF NOT EXISTS idx_credit_card_bills_due_date ON credit_card_bills(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_card_bills_belvo_id ON credit_card_bills(belvo_bill_id) WHERE belvo_bill_id IS NOT NULL;

-- ============================================================================
-- 5. EXTEND EXPENSES WITH BELVO FIELDS
-- ============================================================================
DO $$ 
BEGIN
  -- Belvo transaction ID (unique for deduplication)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'belvo_transaction_id') THEN
    ALTER TABLE expenses ADD COLUMN belvo_transaction_id TEXT;
  END IF;
  
  -- Belvo account ID reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'belvo_account_id') THEN
    ALTER TABLE expenses ADD COLUMN belvo_account_id TEXT;
  END IF;
  
  -- Transaction channel (from Belvo)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'transaction_channel') THEN
    ALTER TABLE expenses ADD COLUMN transaction_channel TEXT;
  END IF;
  
  -- Flag if this came from Belvo payload
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_belvo_payload') THEN
    ALTER TABLE expenses ADD COLUMN is_belvo_payload BOOLEAN DEFAULT false;
  END IF;
  
  -- Flag if this is a transfer (not an expense)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_transfer') THEN
    ALTER TABLE expenses ADD COLUMN is_transfer BOOLEAN DEFAULT false;
  END IF;
  
  -- Bank account ID (when paid via debit/bank transfer)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'bank_account_id') THEN
    ALTER TABLE expenses ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create unique index on belvo_transaction_id for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_belvo_transaction_id ON expenses(belvo_transaction_id) WHERE belvo_transaction_id IS NOT NULL;

-- Index for Belvo transactions
CREATE INDEX IF NOT EXISTS idx_expenses_is_belvo_payload ON expenses(is_belvo_payload) WHERE is_belvo_payload = true;

-- ============================================================================
-- 6. TRANSFERS TABLE
-- Internal transfers between accounts (not expenses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    from_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    belvo_transaction_id TEXT, -- Belvo transaction ID if synced
    notes TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfers_org ON transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account ON transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_belvo_transaction_id ON transfers(belvo_transaction_id) WHERE belvo_transaction_id IS NOT NULL;

-- ============================================================================
-- 7. BELVO WEBHOOKS PROCESSED TABLE
-- Idempotency table to prevent reprocessing webhooks
-- ============================================================================
CREATE TABLE IF NOT EXISTS belvo_webhooks_processed (
    webhook_id TEXT PRIMARY KEY, -- Belvo's webhook ID
    event_type TEXT NOT NULL,
    link_id TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payload JSONB, -- Store full payload for debugging
    processing_status TEXT DEFAULT 'success' CHECK (processing_status IN ('success', 'failed', 'partial')),
    error_message TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_belvo_webhooks_link_id ON belvo_webhooks_processed(link_id);
CREATE INDEX IF NOT EXISTS idx_belvo_webhooks_event_type ON belvo_webhooks_processed(event_type);
CREATE INDEX IF NOT EXISTS idx_belvo_webhooks_processed_at ON belvo_webhooks_processed(processed_at);

-- ============================================================================
-- 8. EXTEND INCOMES WITH BELVO FIELDS (for completeness)
-- ============================================================================
DO $$ 
BEGIN
  -- Belvo transaction ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'belvo_transaction_id') THEN
    ALTER TABLE incomes ADD COLUMN belvo_transaction_id TEXT;
  END IF;
  
  -- Belvo account ID reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'belvo_account_id') THEN
    ALTER TABLE incomes ADD COLUMN belvo_account_id TEXT;
  END IF;
  
  -- Bank account ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'bank_account_id') THEN
    ALTER TABLE incomes ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
  
  -- Payment method (similar to expenses)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'payment_method') THEN
    ALTER TABLE incomes ADD COLUMN payment_method TEXT;
  END IF;
  
  -- Category ID (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'category_id') THEN
    ALTER TABLE incomes ADD COLUMN category_id UUID REFERENCES budget_categories(id);
  END IF;
END $$;

-- Create unique index on belvo_transaction_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_incomes_belvo_transaction_id ON incomes(belvo_transaction_id) WHERE belvo_transaction_id IS NOT NULL;

-- ============================================================================
-- COMPLETED
-- ============================================================================

SELECT '✅ Belvo Open Finance schema migration completed!' as status;
