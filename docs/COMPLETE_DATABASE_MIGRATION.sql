-- ============================================================================
-- MIGRAÇÃO COMPLETA DO BANCO DE DADOS
-- Copie TODO este arquivo e execute no SQL Editor do novo projeto Supabase
-- ============================================================================

-- ============================================================================
-- 1. ADICIONAR COLUNAS EM TABELAS EXISTENTES (Supabase já cria algumas)
-- ============================================================================

-- 1.1 Organizations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'type') THEN
    ALTER TABLE organizations ADD COLUMN type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family'));
    COMMENT ON COLUMN organizations.type IS 'Tipo: solo ou family';
    CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'email') THEN
    ALTER TABLE organizations ADD COLUMN email VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'invite_code') THEN
    ALTER TABLE organizations ADD COLUMN invite_code VARCHAR(10);
  END IF;
END $$;

-- 1.2 Cost Centers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'default_split_percentage') THEN
    ALTER TABLE cost_centers ADD COLUMN default_split_percentage DECIMAL(5,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'user_id') THEN
    ALTER TABLE cost_centers ADD COLUMN user_id UUID REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'linked_email') THEN
    ALTER TABLE cost_centers ADD COLUMN linked_email VARCHAR(255);
  END IF;
END $$;

-- 1.3 Budget Categories
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_categories' AND column_name = 'color') THEN
    ALTER TABLE budget_categories ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_categories' AND column_name = 'is_default') THEN
    ALTER TABLE budget_categories ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 1.4 Expenses - adicionar is_shared
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_shared') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'split') THEN
      ALTER TABLE expenses RENAME COLUMN split TO is_shared;
    ELSE
      ALTER TABLE expenses ADD COLUMN is_shared BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;

-- 1.5 Users - verificar colunas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
    ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
  END IF;
  
  -- NOTA: A coluna whatsapp_phone foi removida. Use apenas 'phone' para telefone/WhatsApp.
  -- Se a coluna whatsapp_phone existir, remova-a:
  -- ALTER TABLE users DROP COLUMN IF EXISTS whatsapp_phone;
  
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name LIKE '%role%' AND table_name = 'users') THEN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'member', 'viewer'));
  END IF;
END $$;

-- 1.6 Cards - adicionar is_shared
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'is_shared') THEN
    ALTER TABLE cards ADD COLUMN is_shared BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 1.7 Budgets - adicionar is_shared
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'is_shared') THEN
    ALTER TABLE budgets ADD COLUMN is_shared BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 1.8 Pending Invites
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pending_invites' AND column_name = 'name') THEN
    ALTER TABLE pending_invites ADD COLUMN name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pending_invites' AND column_name = 'role') THEN
    ALTER TABLE pending_invites ADD COLUMN role VARCHAR(50) DEFAULT 'member';
  END IF;
END $$;

-- ============================================================================
-- 2. CRIAR TABELAS FINANCEIRAS
-- ============================================================================

-- 2.1 Incomes
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT,
    cost_center_id UUID REFERENCES cost_centers(id),
    is_shared BOOLEAN DEFAULT false,
    source TEXT DEFAULT 'manual' CHECK (source IN ('whatsapp', 'manual', 'import')),
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Income Splits
CREATE TABLE IF NOT EXISTS income_splits (
    id BIGSERIAL PRIMARY KEY,
    income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(income_id, cost_center_id)
);

-- 2.3 Bills
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    category_id UUID REFERENCES budget_categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency TEXT CHECK (recurrence_frequency IN ('monthly', 'weekly', 'yearly')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'other')),
    card_id UUID REFERENCES cards(id),
    expense_id BIGINT REFERENCES expenses(id),
    notified_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. CRIAR TABELAS DE SISTEMA
-- ============================================================================

-- 3.1 Onboarding Progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  is_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped BOOLEAN DEFAULT FALSE,
  step_data JSONB DEFAULT '{}'
);

-- 3.2 Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_card_info', 'completed', 'cancelled')),
    conversation_state JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.3 User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 3.4 Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'bill_reminder', 'investment_reminder', 'budget_alert', 
        'daily_reminder', 'weekly_report', 'monthly_report', 
        'insight', 'expense_confirmation', 'system_alert'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    sent_via TEXT DEFAULT 'inapp' CHECK (sent_via IN ('whatsapp', 'email', 'inapp')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5 Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'inapp')),
    template_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.6 Notification History
CREATE TABLE IF NOT EXISTS notification_history (
    id BIGSERIAL PRIMARY KEY,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    error_message TEXT,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'inapp')),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 4. CRIAR TABELAS SECUNDÁRIAS (Opcionais)
-- ============================================================================

-- 4.1 Investment Goals
CREATE TABLE IF NOT EXISTS investment_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'biweekly', 'weekly')),
    due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
    cost_center_id UUID REFERENCES cost_centers(id),
    is_active BOOLEAN DEFAULT true,
    is_shared BOOLEAN DEFAULT false,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.2 Investment Contributions
CREATE TABLE IF NOT EXISTS investment_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES investment_goals(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.3 Bank Accounts
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

-- 4.4 Bank Account Transactions
CREATE TABLE IF NOT EXISTS bank_account_transactions (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'manual_credit', 'manual_debit', 'expense_payment', 
        'bill_payment', 'income_deposit', 'transfer_in', 'transfer_out'
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

-- 4.5 Bank Account Shares
CREATE TABLE IF NOT EXISTS bank_account_shares (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    UNIQUE(bank_account_id, cost_center_id)
);

-- 4.6 User Tours
CREATE TABLE IF NOT EXISTS user_tours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tour_name VARCHAR(100) NOT NULL,
    completed_steps JSONB DEFAULT '[]',
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id, tour_name)
);

-- 4.7 Verification Codes
CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    verification_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. INDÍCES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_expenses_is_shared ON expenses(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_is_shared ON incomes(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_organization ON incomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_income_splits_income ON income_splits(income_id);
CREATE INDEX IF NOT EXISTS idx_income_splits_cost_center ON income_splits(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bills_organization ON bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_organization_id ON onboarding_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_goals_org ON investment_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_active ON investment_goals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_account_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_account_transactions(date DESC);

-- ============================================================================
-- 6. TRIGGERS E FUNÇÕES CRÍTICOS
-- ============================================================================

-- 6.1 Auto criar cost center
CREATE OR REPLACE FUNCTION auto_create_cost_center_for_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name VARCHAR(255);
  user_email VARCHAR(255);
BEGIN
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    SELECT name, email INTO user_name, user_email FROM users WHERE id = NEW.id;
    
    IF NOT EXISTS (
      SELECT 1 FROM cost_centers 
      WHERE organization_id = NEW.organization_id AND user_id = NEW.id
    ) THEN
      INSERT INTO cost_centers (
        organization_id, name, user_id, linked_email,
        default_split_percentage, color, is_active
      ) VALUES (
        NEW.organization_id, COALESCE(user_name, 'Novo Membro'), NEW.id, user_email,
        100.00, '#3B82F6', true
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_cost_center ON users;
CREATE TRIGGER trigger_auto_create_cost_center
  AFTER INSERT OR UPDATE OF organization_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_cost_center_for_user();

-- 6.2 Rebalancear quando 2º membro entrar
CREATE OR REPLACE FUNCTION rebalance_split_percentages_on_new_member()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    SELECT COUNT(*) INTO member_count FROM users
    WHERE organization_id = NEW.organization_id AND is_active = true AND role IN ('admin', 'member');
    
    IF member_count = 2 THEN
      UPDATE cost_centers
      SET default_split_percentage = 50.00, updated_at = NOW()
      WHERE organization_id = NEW.organization_id AND user_id IS NOT NULL AND is_active = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_rebalance_on_new_member ON users;
CREATE TRIGGER trigger_rebalance_on_new_member
  AFTER UPDATE OF organization_id ON users
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION rebalance_split_percentages_on_new_member();

-- ============================================================================
-- 7. CASCADE CONSTRAINTS
-- ============================================================================

ALTER TABLE expense_splits 
DROP CONSTRAINT IF EXISTS expense_splits_cost_center_id_fkey;

ALTER TABLE expense_splits 
ADD CONSTRAINT expense_splits_cost_center_id_fkey 
FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE;

ALTER TABLE income_splits 
DROP CONSTRAINT IF EXISTS income_splits_cost_center_id_fkey;

ALTER TABLE income_splits 
ADD CONSTRAINT income_splits_cost_center_id_fkey 
FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE;

-- ============================================================================
-- CONCLUÍDO
-- ============================================================================

SELECT '✅ Migração completa concluída!' as status;


