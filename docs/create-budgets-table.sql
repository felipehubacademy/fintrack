-- ============================================
-- CRIAR/CORRIGIR TABELA BUDGETS
-- ============================================

-- Verificar se a tabela budgets existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'budgets' AND table_schema = 'public';

-- Criar tabela budgets se não existir
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, cost_center_id, category_id, month, year)
);

-- Verificar se as colunas existem
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'budgets' 
AND table_schema = 'public'
ORDER BY ordinal_position;
