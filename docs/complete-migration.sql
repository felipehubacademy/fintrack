-- ============================================================================
-- MIGRAÇÃO COMPLETA PARA NOVO PROJETO SUPABASE
-- Execute este arquivo no SQL Editor do novo projeto
-- Ordem: Executar tudo de uma vez
-- ============================================================================

-- ============================================================================
-- 1. TABELAS DE BASE
-- ============================================================================

-- 1.1 Organizations (já existe pelo Supabase, apenas adicionar colunas se necessário)
DO $$ 
BEGIN
  -- Adicionar coluna type se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'type'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN type VARCHAR(20) DEFAULT 'family' CHECK (type IN ('solo', 'family'));
    
    COMMENT ON COLUMN organizations.type IS 'Tipo de organização: solo (individual) ou family (familiar)';
    
    CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
  END IF;
  
  -- Adicionar coluna email se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'email'
  ) THEN
    ALTER TABLE organizations ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- 1.2 Cost Centers (adicionar colunas se necessário)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'default_split_percentage'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN default_split_percentage DECIMAL(5,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN user_id UUID REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'linked_email'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN linked_email VARCHAR(255);
  END IF;
END $$;

-- 1.3 Budget Categories (adicionar colunas se necessário)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================================================
-- 2. TABELAS FINANCEIRAS
-- ============================================================================

-- 2.1 Expenses (adicionar is_shared se necessário)
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

-- 2.2 Incomes
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

-- 2.3 Income Splits
CREATE TABLE IF NOT EXISTS income_splits (
    id BIGSERIAL PRIMARY KEY,
    income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(income_id, cost_center_id)
);

-- 2.4 Bills (Contas a Pagar)
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

-- 3.2 Pending Invites (adicionar colunas se necessário)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' AND column_name = 'name'
  ) THEN
    ALTER TABLE pending_invites ADD COLUMN name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' AND column_name = 'role'
  ) THEN
    ALTER TABLE pending_invites ADD COLUMN role VARCHAR(50) DEFAULT 'member';
  END IF;
END $$;

-- ============================================================================
-- 4. INDÍCES PARA PERFORMANCE
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

-- ============================================================================
-- 5. TRIGGERS E FUNÇÕES
-- ============================================================================

-- 5.1 Função para criar cost center automaticamente
CREATE OR REPLACE FUNCTION auto_create_cost_center_for_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name VARCHAR(255);
  user_email VARCHAR(255);
BEGIN
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    SELECT name, email INTO user_name, user_email
    FROM users
    WHERE id = NEW.id;
    
    IF NOT EXISTS (
      SELECT 1 FROM cost_centers 
      WHERE organization_id = NEW.organization_id 
        AND user_id = NEW.id
    ) THEN
      INSERT INTO cost_centers (
        organization_id,
        name,
        user_id,
        linked_email,
        default_split_percentage,
        color,
        is_active
      ) VALUES (
        NEW.organization_id,
        COALESCE(user_name, 'Novo Membro'),
        NEW.id,
        user_email,
        100.00,
        '#3B82F6',
        true
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Trigger para criar cost center
DROP TRIGGER IF EXISTS trigger_auto_create_cost_center ON users;
CREATE TRIGGER trigger_auto_create_cost_center
  AFTER INSERT OR UPDATE OF organization_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_cost_center_for_user();

-- 5.3 Função para rebalancear percentuais
CREATE OR REPLACE FUNCTION rebalance_split_percentages_on_new_member()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    SELECT COUNT(*) INTO member_count
    FROM users
    WHERE organization_id = NEW.organization_id
      AND is_active = true
      AND role IN ('admin', 'member');
    
    IF member_count = 2 THEN
      UPDATE cost_centers
      SET default_split_percentage = 50.00,
          updated_at = NOW()
      WHERE organization_id = NEW.organization_id
        AND user_id IS NOT NULL
        AND is_active = true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Trigger para rebalancear
DROP TRIGGER IF EXISTS trigger_rebalance_on_new_member ON users;
CREATE TRIGGER trigger_rebalance_on_new_member
  AFTER UPDATE OF organization_id ON users
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION rebalance_split_percentages_on_new_member();

-- ============================================================================
-- 6. CASCADE CONSTRAINTS
-- ============================================================================

ALTER TABLE expense_splits 
DROP CONSTRAINT IF EXISTS expense_splits_cost_center_id_fkey;

ALTER TABLE expense_splits 
ADD CONSTRAINT expense_splits_cost_center_id_fkey 
FOREIGN KEY (cost_center_id) 
REFERENCES cost_centers(id) 
ON DELETE CASCADE;

ALTER TABLE income_splits 
DROP CONSTRAINT IF EXISTS income_splits_cost_center_id_fkey;

ALTER TABLE income_splits 
ADD CONSTRAINT income_splits_cost_center_id_fkey 
FOREIGN KEY (cost_center_id) 
REFERENCES cost_centers(id) 
ON DELETE CASCADE;

-- ============================================================================
-- 7. COMENTÁRIOS
-- ============================================================================

COMMENT ON COLUMN expenses.is_shared IS 'Se true, despesa é compartilhada com toda organização. Se false, é individual (privada)';
COMMENT ON COLUMN incomes.is_shared IS 'Se true, entrada é compartilhada com toda organização. Se false, é individual (privada)';
COMMENT ON TABLE bills IS 'Contas a pagar com suporte a recorrência e notificações';
COMMENT ON TABLE income_splits IS 'Divisão de entradas compartilhadas entre centros de custo';

-- ============================================================================
-- CONCLUÍDO
-- ============================================================================

SELECT 'Migration completed successfully!' as status;


