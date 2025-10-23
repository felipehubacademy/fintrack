-- ============================================================================
-- MIGRATION: Create Incomes Tables (Entradas Financeiras)
-- Description: Tabelas para gerenciar entradas com suporte a divisão por centro de custo
-- Date: 2025-10-23
-- Execute no Supabase SQL Editor
-- ============================================================================

-- Verificar se budget_categories tem as colunas necessárias
DO $$ 
BEGIN
  -- Adicionar color se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
  END IF;
  
  -- Adicionar is_default se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'budget_categories' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE budget_categories 
    ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 1. Criar tabela incomes
-- ============================================================================
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

-- 2. Criar tabela income_splits
-- ============================================================================
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

-- 3. Criar índices para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_organization ON incomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_status ON incomes(status);
CREATE INDEX IF NOT EXISTS idx_incomes_shared ON incomes(is_shared);

CREATE INDEX IF NOT EXISTS idx_income_splits_income ON income_splits(income_id);
CREATE INDEX IF NOT EXISTS idx_income_splits_cost_center ON income_splits(cost_center_id);

-- 4. Adicionar comentários
-- ============================================================================
COMMENT ON TABLE incomes IS 'Entradas financeiras com suporte a divisão por centro de custo';
COMMENT ON COLUMN incomes.is_shared IS 'Se true, entrada é dividida entre centros usando income_splits';
COMMENT ON COLUMN incomes.cost_center_id IS 'Para entradas individuais (100% para um centro)';
COMMENT ON TABLE income_splits IS 'Divisão de entradas compartilhadas entre centros de custo';
COMMENT ON COLUMN income_splits.percentage IS 'Percentual da entrada para este centro (soma deve ser 100%)';

-- 5. Criar função para validar splits
-- ============================================================================
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
        RAISE EXCEPTION 'Soma dos percentuais não pode ultrapassar 100%% (atual: %%)', total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para validar splits
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_validate_income_splits ON income_splits;

CREATE TRIGGER trigger_validate_income_splits
    BEFORE INSERT OR UPDATE ON income_splits
    FOR EACH ROW
    EXECUTE FUNCTION validate_income_splits();

-- 7. Criar função helper para criar entrada com splits
-- ============================================================================
CREATE OR REPLACE FUNCTION create_income_with_splits(
    p_description TEXT,
    p_amount DECIMAL(10,2),
    p_date DATE,
    p_category TEXT,
    p_splits JSONB, -- Array de {cost_center_id, percentage}
    p_organization_id UUID,
    p_user_id UUID,
    p_source TEXT DEFAULT 'manual'
)
RETURNS UUID AS $$
DECLARE
    income_id UUID;
    split JSONB;
    split_amount DECIMAL(10,2);
BEGIN
    -- Criar entrada compartilhada
    INSERT INTO incomes (
        description,
        amount,
        date,
        category,
        is_shared,
        source,
        status,
        organization_id,
        user_id
    ) VALUES (
        p_description,
        p_amount,
        p_date,
        p_category,
        true,
        p_source,
        'confirmed',
        p_organization_id,
        p_user_id
    ) RETURNING id INTO income_id;
    
    -- Criar splits
    FOR split IN SELECT * FROM jsonb_array_elements(p_splits)
    LOOP
        split_amount := ROUND(p_amount * (split->>'percentage')::DECIMAL / 100, 2);
        
        INSERT INTO income_splits (
            income_id,
            cost_center_id,
            percentage,
            amount
        ) VALUES (
            income_id,
            (split->>'cost_center_id')::UUID,
            (split->>'percentage')::DECIMAL,
            split_amount
        );
    END LOOP;
    
    RETURN income_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Verificar criação
-- ============================================================================
SELECT 
    'incomes' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'incomes'

UNION ALL

SELECT 
    'income_splits' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'income_splits'

ORDER BY table_name, ordinal_position;

COMMENT ON TABLE incomes IS 'Migration completed: create-incomes-table.sql';

