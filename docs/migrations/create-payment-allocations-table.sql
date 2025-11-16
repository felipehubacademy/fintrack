-- ============================================================================
-- Migration: Criar tabelas de Payment Allocations (Aportes)
-- Data: 16/11/2025
-- Descrição: Cria estrutura para registrar aportes destinados ao pagamento
--            de despesas, separando do conceito de "income" (entrada em conta)
-- ============================================================================

-- ============================================================================
-- 1. CRIAR TABELA payment_allocations
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos do aporte
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    description TEXT,
    
    -- Destino do aporte
    allocation_target TEXT NOT NULL CHECK (allocation_target IN ('individual', 'shared')),
    
    -- Quem está aportando
    ownership_type TEXT NOT NULL CHECK (ownership_type IN ('member', 'organization')),
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
    
    -- Conta de origem
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    
    -- Referência do mês (para relatórios)
    month_reference TEXT NOT NULL, -- formato: 'YYYY-MM'
    
    -- Organização e usuário
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Validação: se ownership='member', cost_center_id deve estar preenchido
    CONSTRAINT check_member_has_cost_center CHECK (
        (ownership_type = 'organization') OR 
        (ownership_type = 'member' AND cost_center_id IS NOT NULL)
    )
);

-- ============================================================================
-- 2. CRIAR TABELA payment_allocation_splits
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_allocation_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_allocation_id UUID NOT NULL REFERENCES payment_allocations(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(payment_allocation_id, cost_center_id)
);

-- ============================================================================
-- 3. CRIAR ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_allocations_organization 
    ON payment_allocations(organization_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_date 
    ON payment_allocations(date);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_month_reference 
    ON payment_allocations(month_reference);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_cost_center 
    ON payment_allocations(cost_center_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_bank_account 
    ON payment_allocations(bank_account_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocation_splits_allocation 
    ON payment_allocation_splits(payment_allocation_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocation_splits_cost_center 
    ON payment_allocation_splits(cost_center_id);

-- ============================================================================
-- 4. ADICIONAR COMENTÁRIOS
-- ============================================================================
COMMENT ON TABLE payment_allocations IS 
    'Aportes destinados ao pagamento de despesas (individual ou compartilhada)';

COMMENT ON COLUMN payment_allocations.allocation_target IS 
    'Destino do aporte: individual (despesas individuais) ou shared (despesas compartilhadas)';

COMMENT ON COLUMN payment_allocations.ownership_type IS 
    'Quem está aportando: member (um membro específico) ou organization (divisão entre membros)';

COMMENT ON COLUMN payment_allocations.month_reference IS 
    'Mês de referência no formato YYYY-MM para relatórios de fechamento';

COMMENT ON TABLE payment_allocation_splits IS 
    'Divisão de aportes organizacionais entre membros (quando ownership_type=organization)';

COMMENT ON COLUMN payment_allocation_splits.percentage IS 
    'Percentual do aporte para este membro (soma deve ser 100%)';

COMMENT ON COLUMN payment_allocation_splits.amount IS 
    'Valor do aporte para este membro';

-- ============================================================================
-- 5. HABILITAR ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocation_splits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CRIAR POLÍTICAS RLS
-- ============================================================================

-- Política para payment_allocations
DROP POLICY IF EXISTS "Users can view allocations from their organization" ON payment_allocations;
CREATE POLICY "Users can view allocations from their organization"
    ON payment_allocations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert allocations in their organization" ON payment_allocations;
CREATE POLICY "Users can insert allocations in their organization"
    ON payment_allocations FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update allocations in their organization" ON payment_allocations;
CREATE POLICY "Users can update allocations in their organization"
    ON payment_allocations FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete allocations in their organization" ON payment_allocations;
CREATE POLICY "Users can delete allocations in their organization"
    ON payment_allocations FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Política para payment_allocation_splits
DROP POLICY IF EXISTS "Users can view splits from their organization" ON payment_allocation_splits;
CREATE POLICY "Users can view splits from their organization"
    ON payment_allocation_splits FOR SELECT
    USING (
        payment_allocation_id IN (
            SELECT id FROM payment_allocations
            WHERE organization_id IN (
                SELECT organization_id 
                FROM users 
                WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert splits in their organization" ON payment_allocation_splits;
CREATE POLICY "Users can insert splits in their organization"
    ON payment_allocation_splits FOR INSERT
    WITH CHECK (
        payment_allocation_id IN (
            SELECT id FROM payment_allocations
            WHERE organization_id IN (
                SELECT organization_id 
                FROM users 
                WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update splits in their organization" ON payment_allocation_splits;
CREATE POLICY "Users can update splits in their organization"
    ON payment_allocation_splits FOR UPDATE
    USING (
        payment_allocation_id IN (
            SELECT id FROM payment_allocations
            WHERE organization_id IN (
                SELECT organization_id 
                FROM users 
                WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can delete splits in their organization" ON payment_allocation_splits;
CREATE POLICY "Users can delete splits in their organization"
    ON payment_allocation_splits FOR DELETE
    USING (
        payment_allocation_id IN (
            SELECT id FROM payment_allocations
            WHERE organization_id IN (
                SELECT organization_id 
                FROM users 
                WHERE id = auth.uid()
            )
        )
    );

-- ============================================================================
-- 7. CRIAR TRIGGER PARA UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_payment_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_allocations_updated_at ON payment_allocations;
CREATE TRIGGER trigger_update_payment_allocations_updated_at
    BEFORE UPDATE ON payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_allocations_updated_at();

