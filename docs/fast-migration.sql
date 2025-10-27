-- ============================================================================
-- MIGRAÇÃO RÁPIDA - APENAS TABELAS ESSENCIAIS
-- Este SQL cria apenas o que é CRÍTICO para o projeto funcionar
-- Execute no SQL Editor do novo projeto Supabase
-- ============================================================================

-- ============================================================================
-- 1. CORES BÁSICAS
-- ============================================================================

-- Adicionar colunas essenciais em tabelas existentes
DO $$ 
BEGIN
  -- Organizations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'type'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family'));
    COMMENT ON COLUMN organizations.type IS 'Tipo: solo ou family';
    CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
  END IF;
  
  -- Cost Centers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'default_split_percentage'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN default_split_percentage DECIMAL(5,2) DEFAULT 0.00,
    ADD COLUMN user_id UUID REFERENCES users(id),
    ADD COLUMN linked_email VARCHAR(255);
  END IF;
  
  -- Budget Categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6',
    ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Expenses - adicionar is_shared
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'is_shared'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'expenses' AND column_name = 'split'
    ) THEN
      ALTER TABLE expenses RENAME COLUMN split TO is_shared;
    ELSE
      ALTER TABLE expenses ADD COLUMN is_shared BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 2. TABELAS FINANCEIRAS
-- ============================================================================

-- Incomes
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

-- Income Splits
CREATE TABLE IF NOT EXISTS income_splits (
    id BIGSERIAL PRIMARY KEY,
    income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(income_id, cost_center_id)
);

-- Bills
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
-- 3. TABELAS DE SISTEMA
-- ============================================================================

-- Onboarding
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

-- ============================================================================
-- 4. INDÍCES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_expenses_is_shared ON expenses(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_is_shared ON incomes(is_shared, organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_organization ON incomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_income_splits_income ON income_splits(income_id);
CREATE INDEX IF NOT EXISTS idx_bills_organization ON bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_progress(user_id);

-- ============================================================================
-- 5. TRIGGERS CRÍTICOS
-- ============================================================================

-- Auto criar cost center
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

-- Rebalancear quando adicionar 2º membro
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
-- CONCLUÍDO
-- ============================================================================

SELECT 'Migração rápida concluída! ✅' as status;


