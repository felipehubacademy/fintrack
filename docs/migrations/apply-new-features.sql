-- ============================================================================
-- MIGRATION: Apply New Features (Bills, Incomes, Investment Goals)
-- Description: Aplica apenas as mudanças necessárias para as novas funcionalidades
-- Date: 2025-10-23
-- Execute no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PARTE 1: Verificar e adicionar colunas necessárias nas tabelas existentes
-- ============================================================================

-- 1.1. Adicionar colunas em cost_centers se não existirem
DO $$ 
BEGIN
  -- default_split_percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'default_split_percentage'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN default_split_percentage DECIMAL(5,2) DEFAULT 0.00;
    RAISE NOTICE '✅ Adicionada coluna default_split_percentage em cost_centers';
  END IF;
  
  -- user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN user_id UUID REFERENCES users(id);
    RAISE NOTICE '✅ Adicionada coluna user_id em cost_centers';
  END IF;
  
  -- linked_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cost_centers' AND column_name = 'linked_email'
  ) THEN
    ALTER TABLE cost_centers 
    ADD COLUMN linked_email VARCHAR(255);
    RAISE NOTICE '✅ Adicionada coluna linked_email em cost_centers';
  END IF;
END $$;

-- 1.2. Adicionar colunas em budget_categories se não existirem
DO $$ 
BEGIN
  -- color
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
    RAISE NOTICE '✅ Adicionada coluna color em budget_categories';
  END IF;
  
  -- is_default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Adicionada coluna is_default em budget_categories';
  END IF;
END $$;

-- 1.3. Adicionar colunas em users se não existirem
DO $$ 
BEGIN
  -- NOTA: A coluna whatsapp_phone foi removida. Use apenas 'phone' para telefone/WhatsApp.
  -- A coluna 'phone' já deve existir. Se não existir, adicione:
  -- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
  
  -- Atualizar constraint de role para incluir 'viewer' (simplificado)
  -- Remover constraint antiga se existir e adicionar nova
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'member', 'viewer'));
  RAISE NOTICE '✅ Atualizada constraint de role em users para incluir viewer';
END $$;

-- 1.4. Adicionar colunas em pending_invites se não existirem
DO $$ 
BEGIN
  -- name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' AND column_name = 'name'
  ) THEN
    ALTER TABLE pending_invites 
    ADD COLUMN name VARCHAR(255);
    RAISE NOTICE '✅ Adicionada coluna name em pending_invites';
  END IF;
  
  -- role (se não existir ou não incluir viewer)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' AND column_name = 'role'
  ) THEN
    ALTER TABLE pending_invites 
    ADD COLUMN role VARCHAR(20) DEFAULT 'member';
    RAISE NOTICE '✅ Adicionada coluna role em pending_invites';
  END IF;
  
  -- Atualizar constraint de role (simplificado)
  -- Remover constraint antiga se existir e adicionar nova
  ALTER TABLE pending_invites DROP CONSTRAINT IF EXISTS pending_invites_role_check;
  ALTER TABLE pending_invites 
  ADD CONSTRAINT pending_invites_role_check 
  CHECK (role IN ('admin', 'member', 'viewer'));
  RAISE NOTICE '✅ Atualizada constraint de role em pending_invites para incluir viewer';
END $$;

-- ============================================================================
-- PARTE 2: Criar tabelas das novas funcionalidades
-- ============================================================================

-- 2.1. Criar tabela bills (Contas a Pagar)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos da conta
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    
    -- Categorização
    category_id UUID REFERENCES budget_categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Recorrência
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency TEXT CHECK (recurrence_frequency IN ('monthly', 'weekly', 'yearly')),
    
    -- Status e pagamento
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'other')),
    
    -- Referências
    card_id UUID REFERENCES cards(id),
    expense_id BIGINT REFERENCES expenses(id), -- BIGINT para compatibilidade
    
    -- Notificações
    notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Organização e usuário
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2. Criar tabela incomes (Entradas Financeiras)
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos da entrada
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Categorização
    category TEXT, -- Categoria livre (ex: "Salário", "Freelance", "Investimento")
    cost_center_id UUID REFERENCES cost_centers(id), -- Para entradas individuais (100%)
    
    -- Divisão
    is_shared BOOLEAN DEFAULT false, -- Se true, usa income_splits
    
    -- Origem e status
    source TEXT DEFAULT 'manual' CHECK (source IN ('whatsapp', 'manual', 'import')),
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    
    -- Organização e usuário
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3. Criar tabela income_splits
CREATE TABLE IF NOT EXISTS income_splits (
    id BIGSERIAL PRIMARY KEY,
    
    -- Referência à entrada
    income_id UUID NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
    
    -- Centro de custo e divisão
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada cost_center aparece apenas uma vez por entrada
    UNIQUE(income_id, cost_center_id)
);

-- 2.4. Criar tabela investment_goals
CREATE TABLE IF NOT EXISTS investment_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos da meta
    name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
    
    -- Frequência e dia de aporte
    frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'biweekly', 'weekly')),
    due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31), -- Dia do mês para notificar
    
    -- Centro de custo (opcional)
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Notificações
    last_notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Organização e usuário
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5. Criar tabela investment_contributions
CREATE TABLE IF NOT EXISTS investment_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência à meta
    goal_id UUID NOT NULL REFERENCES investment_goals(id) ON DELETE CASCADE,
    
    -- Dados do aporte
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PARTE 3: Criar índices para performance
-- ============================================================================

-- Índices para bills
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bills_organization ON bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_recurring ON bills(is_recurring) WHERE is_recurring = true;

-- Índices para incomes
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_organization ON incomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_status ON incomes(status);
CREATE INDEX IF NOT EXISTS idx_incomes_shared ON incomes(is_shared);

-- Índices para income_splits
CREATE INDEX IF NOT EXISTS idx_income_splits_income ON income_splits(income_id);
CREATE INDEX IF NOT EXISTS idx_income_splits_cost_center ON income_splits(cost_center_id);

-- Índices para investment_goals
CREATE INDEX IF NOT EXISTS idx_investment_goals_org ON investment_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON investment_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_active ON investment_goals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_investment_goals_due_day ON investment_goals(due_day) WHERE is_active = true;

-- Índices para investment_contributions
CREATE INDEX IF NOT EXISTS idx_investment_contributions_goal ON investment_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_date ON investment_contributions(date);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_confirmed ON investment_contributions(confirmed);

-- ============================================================================
-- PARTE 4: Criar funções auxiliares
-- ============================================================================

-- 4.1. Função para atualizar status overdue automaticamente
CREATE OR REPLACE FUNCTION update_bills_overdue_status()
RETURNS void AS $$
BEGIN
    UPDATE bills
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 4.2. Função para gerar conta recorrente
CREATE OR REPLACE FUNCTION create_recurring_bill(bill_id UUID)
RETURNS UUID AS $$
DECLARE
    original_bill bills%ROWTYPE;
    new_due_date DATE;
    new_bill_id UUID;
BEGIN
    -- Buscar conta original
    SELECT * INTO original_bill FROM bills WHERE id = bill_id;
    
    IF NOT original_bill.is_recurring THEN
        RAISE EXCEPTION 'Conta não é recorrente';
    END IF;
    
    -- Calcular próxima data de vencimento
    CASE original_bill.recurrence_frequency
        WHEN 'monthly' THEN
            new_due_date := original_bill.due_date + INTERVAL '1 month';
        WHEN 'weekly' THEN
            new_due_date := original_bill.due_date + INTERVAL '1 week';
        WHEN 'yearly' THEN
            new_due_date := original_bill.due_date + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Frequência de recorrência inválida';
    END CASE;
    
    -- Criar nova conta
    INSERT INTO bills (
        description,
        amount,
        due_date,
        category_id,
        cost_center_id,
        is_recurring,
        recurrence_frequency,
        status,
        organization_id,
        user_id
    ) VALUES (
        original_bill.description,
        original_bill.amount,
        new_due_date,
        original_bill.category_id,
        original_bill.cost_center_id,
        original_bill.is_recurring,
        original_bill.recurrence_frequency,
        'pending',
        original_bill.organization_id,
        original_bill.user_id
    ) RETURNING id INTO new_bill_id;
    
    RETURN new_bill_id;
END;
$$ LANGUAGE plpgsql;

-- 4.3. Função para validar splits de income
CREATE OR REPLACE FUNCTION validate_income_splits()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    -- Calcular total de percentuais para esta entrada
    SELECT COALESCE(SUM(percentage), 0)
    INTO total_percentage
    FROM income_splits
    WHERE income_id = NEW.income_id;
    
    -- Validar que não ultrapassa 100%
    IF total_percentage > 100 THEN
        RAISE EXCEPTION 'Soma dos percentuais não pode ultrapassar 100%% (atual: %)', total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4. Função para calcular progresso da meta de investimento
CREATE OR REPLACE FUNCTION get_investment_goal_progress(goal_uuid UUID)
RETURNS TABLE(
    goal_id UUID,
    goal_name TEXT,
    target_amount DECIMAL(10,2),
    total_contributed DECIMAL(10,2),
    progress_percentage DECIMAL(5,2),
    contributions_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ig.id as goal_id,
        ig.name as goal_name,
        ig.target_amount,
        COALESCE(SUM(ic.amount), 0) as total_contributed,
        CASE 
            WHEN ig.target_amount > 0 THEN 
                ROUND((COALESCE(SUM(ic.amount), 0) / ig.target_amount * 100), 2)
            ELSE 0
        END as progress_percentage,
        COUNT(ic.id)::INTEGER as contributions_count
    FROM investment_goals ig
    LEFT JOIN investment_contributions ic ON ic.goal_id = ig.id AND ic.confirmed = true
    WHERE ig.id = goal_uuid
    GROUP BY ig.id, ig.name, ig.target_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 5: Criar triggers
-- ============================================================================

-- 5.1. Trigger para validar splits de income
DROP TRIGGER IF EXISTS trigger_validate_income_splits ON income_splits;
CREATE TRIGGER trigger_validate_income_splits
    BEFORE INSERT OR UPDATE ON income_splits
    FOR EACH ROW
    EXECUTE FUNCTION validate_income_splits();

-- 5.2. Trigger para prevenir aportes duplicados no mesmo dia
CREATE OR REPLACE FUNCTION prevent_duplicate_contribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se já existe aporte para esta meta nesta data
    IF EXISTS (
        SELECT 1 
        FROM investment_contributions 
        WHERE goal_id = NEW.goal_id 
          AND date = NEW.date 
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'Já existe um aporte registrado para esta meta na data %', NEW.date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_duplicate_contribution ON investment_contributions;
CREATE TRIGGER trigger_prevent_duplicate_contribution
    BEFORE INSERT OR UPDATE ON investment_contributions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_contribution();

-- ============================================================================
-- PARTE 6: Adicionar comentários
-- ============================================================================

COMMENT ON TABLE bills IS 'Contas a pagar com suporte a recorrência e notificações';
COMMENT ON COLUMN bills.is_recurring IS 'Se true, gera nova conta automaticamente após pagamento';
COMMENT ON COLUMN bills.recurrence_frequency IS 'Frequência de recorrência (monthly, weekly, yearly)';
COMMENT ON COLUMN bills.status IS 'Status da conta: pending, paid, overdue, cancelled';
COMMENT ON COLUMN bills.expense_id IS 'ID da expense criada ao marcar como paga (BIGINT)';
COMMENT ON COLUMN bills.notified_at IS 'Data/hora da última notificação enviada';

COMMENT ON TABLE incomes IS 'Entradas financeiras com suporte a divisão por centro de custo';
COMMENT ON COLUMN incomes.is_shared IS 'Se true, entrada é dividida entre centros usando income_splits';
COMMENT ON COLUMN incomes.cost_center_id IS 'Para entradas individuais (100% para um centro)';

COMMENT ON TABLE income_splits IS 'Divisão de entradas compartilhadas entre centros de custo';
COMMENT ON COLUMN income_splits.percentage IS 'Percentual da entrada para este centro (soma deve ser 100%)';

COMMENT ON TABLE investment_goals IS 'Metas de investimento com lembretes automáticos';
COMMENT ON COLUMN investment_goals.frequency IS 'Frequência do aporte: monthly, biweekly, weekly';
COMMENT ON COLUMN investment_goals.due_day IS 'Dia do mês para enviar lembrete (1-31)';
COMMENT ON COLUMN investment_goals.last_notified_at IS 'Data/hora do último lembrete enviado';

COMMENT ON TABLE investment_contributions IS 'Registro de aportes realizados em metas de investimento';
COMMENT ON COLUMN investment_contributions.confirmed IS 'Se aporte foi confirmado pelo usuário';

-- ============================================================================
-- PARTE 7: Verificação final
-- ============================================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    'bills' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills') 
         THEN '✅ CRIADA' ELSE '❌ FALHOU' END as status
UNION ALL
SELECT 
    'incomes',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incomes') 
         THEN '✅ CRIADA' ELSE '❌ FALHOU' END
UNION ALL
SELECT 
    'income_splits',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'income_splits') 
         THEN '✅ CRIADA' ELSE '❌ FALHOU' END
UNION ALL
SELECT 
    'investment_goals',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investment_goals') 
         THEN '✅ CRIADA' ELSE '❌ FALHOU' END
UNION ALL
SELECT 
    'investment_contributions',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investment_contributions') 
         THEN '✅ CRIADA' ELSE '❌ FALHOU' END;

-- ============================================================================
-- CONCLUÍDO!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '✅ Todas as tabelas das novas funcionalidades foram criadas';
  RAISE NOTICE '✅ Colunas necessárias foram adicionadas nas tabelas existentes';
  RAISE NOTICE '✅ Índices de performance foram criados';
  RAISE NOTICE '✅ Funções auxiliares foram criadas';
  RAISE NOTICE '✅ Triggers foram configurados';
  RAISE NOTICE '';
  RAISE NOTICE '📋 FUNCIONALIDADES DISPONÍVEIS:';
  RAISE NOTICE '   • Contas a Pagar (bills)';
  RAISE NOTICE '   • Entradas Financeiras (incomes + income_splits)';
  RAISE NOTICE '   • Metas de Investimento (investment_goals + investment_contributions)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 O sistema está pronto para uso!';
END $$;
