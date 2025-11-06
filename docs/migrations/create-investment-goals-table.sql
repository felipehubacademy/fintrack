-- ============================================================================
-- MIGRATION: Create Investment Goals Tables (Metas de Investimento)
-- Description: Tabelas para gerenciar metas de investimento e tracking de aportes
-- Date: 2025-10-23
-- Execute no Supabase SQL Editor
-- ============================================================================

-- Verificar se users tem as colunas necessárias
DO $$ 
BEGIN
  -- NOTA: A coluna whatsapp_phone foi removida. Use apenas 'phone' para telefone/WhatsApp.
  -- A coluna 'phone' já deve existir. Se não existir, adicione:
  -- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
  
  -- Adicionar viewer role se não existir na constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name LIKE '%role%' AND table_name = 'users'
  ) THEN
    -- Remover constraint antiga se existir
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    -- Adicionar nova constraint com viewer
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'member', 'viewer'));
  END IF;
END $$;

-- 1. Criar tabela investment_goals
-- ============================================================================
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

-- 2. Criar tabela investment_contributions
-- ============================================================================
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

-- 3. Criar índices para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_investment_goals_org ON investment_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON investment_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_active ON investment_goals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_investment_goals_due_day ON investment_goals(due_day) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_investment_contributions_goal ON investment_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_date ON investment_contributions(date);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_confirmed ON investment_contributions(confirmed);

-- 4. Adicionar comentários
-- ============================================================================
COMMENT ON TABLE investment_goals IS 'Metas de investimento com lembretes automáticos';
COMMENT ON COLUMN investment_goals.frequency IS 'Frequência do aporte: monthly, biweekly, weekly';
COMMENT ON COLUMN investment_goals.due_day IS 'Dia do mês para enviar lembrete (1-31)';
COMMENT ON COLUMN investment_goals.last_notified_at IS 'Data/hora do último lembrete enviado';

COMMENT ON TABLE investment_contributions IS 'Registro de aportes realizados em metas de investimento';
COMMENT ON COLUMN investment_contributions.confirmed IS 'Se aporte foi confirmado pelo usuário';

-- 5. Criar função para calcular progresso da meta
-- ============================================================================
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

-- 6. Criar função para obter progresso mensal
-- ============================================================================
CREATE OR REPLACE FUNCTION get_monthly_investment_progress(
    goal_uuid UUID,
    reference_month DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    goal_id UUID,
    month DATE,
    target_amount DECIMAL(10,2),
    contributed_amount DECIMAL(10,2),
    progress_percentage DECIMAL(5,2),
    remaining_amount DECIMAL(10,2)
) AS $$
DECLARE
    month_start DATE;
    month_end DATE;
BEGIN
    -- Calcular início e fim do mês
    month_start := DATE_TRUNC('month', reference_month)::DATE;
    month_end := (DATE_TRUNC('month', reference_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    RETURN QUERY
    SELECT 
        ig.id as goal_id,
        month_start as month,
        ig.target_amount,
        COALESCE(SUM(ic.amount), 0) as contributed_amount,
        CASE 
            WHEN ig.target_amount > 0 THEN 
                ROUND((COALESCE(SUM(ic.amount), 0) / ig.target_amount * 100), 2)
            ELSE 0
        END as progress_percentage,
        GREATEST(ig.target_amount - COALESCE(SUM(ic.amount), 0), 0) as remaining_amount
    FROM investment_goals ig
    LEFT JOIN investment_contributions ic 
        ON ic.goal_id = ig.id 
        AND ic.confirmed = true
        AND ic.date >= month_start
        AND ic.date <= month_end
    WHERE ig.id = goal_uuid
    GROUP BY ig.id, ig.target_amount;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para prevenir aportes duplicados no mesmo dia
-- ============================================================================
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

-- 8. Criar função helper para registrar aporte
-- ============================================================================
CREATE OR REPLACE FUNCTION add_investment_contribution(
    p_goal_id UUID,
    p_amount DECIMAL(10,2),
    p_date DATE DEFAULT CURRENT_DATE,
    p_confirmed BOOLEAN DEFAULT true,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    contribution_id UUID;
BEGIN
    INSERT INTO investment_contributions (
        goal_id,
        amount,
        date,
        confirmed,
        notes
    ) VALUES (
        p_goal_id,
        p_amount,
        p_date,
        p_confirmed,
        p_notes
    ) RETURNING id INTO contribution_id;
    
    RETURN contribution_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Verificar criação
-- ============================================================================
SELECT 
    'investment_goals' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'investment_goals'

UNION ALL

SELECT 
    'investment_contributions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'investment_contributions'

ORDER BY table_name, ordinal_position;

COMMENT ON TABLE investment_goals IS 'Migration completed: create-investment-goals-table.sql';

