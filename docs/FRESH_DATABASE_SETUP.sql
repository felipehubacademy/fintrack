-- ============================================================================
-- CONFIGURAÇÃO COMPLETA DO BANCO DO ZERO
-- Para NOVO projeto Supabase (sem dados)
-- Execute TODO este arquivo no SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATIONS
-- ============================================================================

-- Criar tabela se não existir (Supabase geralmente cria, mas garantir)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  email VARCHAR(255),
  invite_code VARCHAR(10) NOT NULL,
  type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'type') THEN
    ALTER TABLE organizations ADD COLUMN type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'email') THEN
    ALTER TABLE organizations ADD COLUMN email VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'invite_code') THEN
    ALTER TABLE organizations ADD COLUMN invite_code VARCHAR(10);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- ============================================================================
-- 2. USERS
-- ============================================================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20), -- Telefone/WhatsApp do usuário (usar esta coluna, não whatsapp_phone)
  phone_verified BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem
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
END $$;

-- ============================================================================
-- 3. COST CENTERS (Responsáveis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  default_split_percentage DECIMAL(5,2) DEFAULT 0.00,
  color VARCHAR(7) DEFAULT '#3B82F6',
  user_id UUID REFERENCES users(id),
  linked_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem
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

-- ============================================================================
-- 4. BUDGET CATEGORIES (Unificadas para expenses e incomes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT FALSE,
  type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_categories' AND column_name = 'color') THEN
    ALTER TABLE budget_categories ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_categories' AND column_name = 'is_default') THEN
    ALTER TABLE budget_categories ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_categories' AND column_name = 'type') THEN
    ALTER TABLE budget_categories ADD COLUMN type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both'));
  END IF;
END $$;

-- Índice para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_budget_categories_type ON budget_categories(type);

-- ============================================================================
-- 5. EXPENSES (Despesas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  category_id UUID REFERENCES budget_categories(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other')),
  card_id UUID,
  is_shared BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar is_shared se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'is_shared') THEN
    ALTER TABLE expenses ADD COLUMN is_shared BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 6. EXPENSE SPLITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_splits (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, cost_center_id)
);

-- ============================================================================
-- 7. INCOMES (Entradas)
-- ============================================================================

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

-- ============================================================================
-- 8. INCOME SPLITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS income_splits (
    id BIGSERIAL PRIMARY KEY,
    income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(income_id, cost_center_id)
);

-- ============================================================================
-- 9. CARDS (Cartões)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  bank VARCHAR(100),
  card_type TEXT CHECK (card_type IN ('credit', 'debit')),
  closing_day INTEGER,
  billing_day INTEGER,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_shared BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar is_shared se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'is_shared') THEN
    ALTER TABLE cards ADD COLUMN is_shared BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 10. BILLS (Contas a Pagar)
-- ============================================================================

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
-- 11. BUDGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id),
  limit_amount DECIMAL(10,2) NOT NULL,
  month_year DATE NOT NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, category_id, month_year)
);

-- Adicionar is_shared se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'is_shared') THEN
    ALTER TABLE budgets ADD COLUMN is_shared BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 12. ONBOARDING PROGRESS
-- ============================================================================

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
  step_data JSONB DEFAULT '{}',
  UNIQUE(user_id, organization_id)
);

-- ============================================================================
-- 13. CONVERSATIONS
-- ============================================================================

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

-- ============================================================================
-- 14. USER PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- ============================================================================
-- 15. NOTIFICATIONS
-- ============================================================================

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

-- ============================================================================
-- 16. NOTIFICATION TEMPLATES
-- ============================================================================

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

-- ============================================================================
-- 17. NOTIFICATION HISTORY
-- ============================================================================

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
-- 18. PENDING INVITES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  invite_code VARCHAR(10) NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Adicionar colunas se não existirem
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
-- 19. INVESTMENT GOALS
-- ============================================================================

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

-- ============================================================================
-- 20. INVESTMENT CONTRIBUTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS investment_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES investment_goals(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 21. BANK ACCOUNTS
-- ============================================================================

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

-- ============================================================================
-- 22. BANK ACCOUNT TRANSACTIONS
-- ============================================================================

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

-- ============================================================================
-- 23. BANK ACCOUNT SHARES
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_account_shares (
    id BIGSERIAL PRIMARY KEY,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    UNIQUE(bank_account_id, cost_center_id)
);

-- ============================================================================
-- 24. USER TOURS
-- ============================================================================

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

-- ============================================================================
-- 25. VERIFICATION CODES
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20), -- Tipo de verificação: whatsapp_code ou whatsapp_link
    token VARCHAR(64) UNIQUE, -- Token único para verificação via link alternativo (opcional)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    verification_attempts INTEGER DEFAULT 0,
    ip_address VARCHAR(45), -- Para segurança: rastrear origem das requisições
    user_agent TEXT, -- Para segurança: identificar navegador/dispositivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_token ON verification_codes(token);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- ============================================================================
-- 26. ALLOWED USERS (se existir)
-- ============================================================================

-- Tabela de controle de acesso se existir

-- ============================================================================
-- 27. INDÍCES PARA PERFORMANCE
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
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_organization_id ON onboarding_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investment_goals_org ON investment_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization ON bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_account_transactions(bank_account_id);

-- ============================================================================
-- 28. TRIGGERS CRÍTICOS
-- ============================================================================

-- 28.1 Auto criar cost center
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

-- 28.2 Rebalancear quando 2º membro entrar
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
-- 29. CATEGORIAS PADRÃO GLOBAIS
-- ============================================================================

-- Categorias padrão de DESPESA (globais, sem organization_id)
INSERT INTO budget_categories (name, color, type, is_default, organization_id)
VALUES 
  ('Alimentação', '#EF4444', 'expense', true, NULL),
  ('Transporte', '#F59E0B', 'expense', true, NULL),
  ('Saúde', '#10B981', 'expense', true, NULL),
  ('Lazer', '#8B5CF6', 'expense', true, NULL),
  ('Contas', '#06B6D4', 'expense', true, NULL),
  ('Casa', '#8B5A2B', 'expense', true, NULL),
  ('Educação', '#EC4899', 'expense', true, NULL),
  ('Investimentos', '#10B981', 'expense', true, NULL),
  ('Outros', '#6B7280', 'expense', true, NULL)
ON CONFLICT DO NOTHING;

-- Categorias padrão de ENTRADA (globais, sem organization_id)
INSERT INTO budget_categories (name, color, type, is_default, organization_id)
VALUES 
  ('Salário', '#10B981', 'income', true, NULL),
  ('Freelance', '#3B82F6', 'income', true, NULL),
  ('Investimentos (Retorno)', '#06B6D4', 'income', true, NULL),
  ('Vendas', '#8B5CF6', 'income', true, NULL),
  ('Aluguel Recebido', '#F59E0B', 'income', true, NULL),
  ('Bonificação', '#EC4899', 'income', true, NULL),
  ('Transferência', '#9CA3AF', 'income', true, NULL),
  ('Outros', '#6B7280', 'income', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONCLUÍDO
-- ============================================================================

SELECT '✅ Banco configurado com sucesso!' as status;

