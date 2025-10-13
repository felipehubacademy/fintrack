-- =====================================================
-- FINTRACK V2 - MIGRAÇÃO CORRIGIDA
-- =====================================================

-- 1. CRIAR NOVAS TABELAS (que não existem)
-- =====================================================

-- Organizações
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    admin_id UUID NOT NULL,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL, -- WhatsApp
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Centros de custo
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'shared', 'custom')),
    split_percentage DECIMAL(5,2) DEFAULT 100.00,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorias de orçamento
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orçamentos mensais
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    month_year DATE NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    current_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, cost_center_id, category_id, month_year)
);

-- Convites pendentes
CREATE TABLE pending_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    invited_by UUID REFERENCES users(id) NOT NULL,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, email)
);

-- 2. ADAPTAR TABELA EXPENSES EXISTENTE
-- =====================================================

-- Adicionar novas colunas à tabela expenses existente
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS cost_center_id UUID,
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'other',
ADD COLUMN IF NOT EXISTS conversation_state JSONB;

-- Adicionar constraints para as novas colunas
ALTER TABLE expenses 
ADD CONSTRAINT expenses_payment_method_check 
CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'other'));

-- Adicionar foreign keys (após criar as tabelas referenciadas)
ALTER TABLE expenses 
ADD CONSTRAINT expenses_organization_fk 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_user_fk 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_cost_center_fk 
FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE;

ALTER TABLE expenses 
ADD CONSTRAINT expenses_category_fk 
FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE;

-- 3. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_cost_centers_organization ON cost_centers(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_organization ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cost_center ON expenses(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_budgets_organization ON budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month_year);

-- 4. CONFIGURAR ROW LEVEL SECURITY
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can see their organization data" ON organizations
    FOR ALL USING (id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can see organization users" ON users
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can see organization cost centers" ON cost_centers
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can see organization budget categories" ON budget_categories
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can see organization budgets" ON budgets
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can see organization expenses" ON expenses
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can see organization invites" ON pending_invites
    FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 5. DADOS INICIAIS
-- =====================================================

-- Categorias padrão do sistema
INSERT INTO budget_categories (id, name, description, is_default) VALUES
(gen_random_uuid(), 'Alimentação', 'Supermercado, restaurantes, delivery', true),
(gen_random_uuid(), 'Transporte', 'Combustível, Uber, transporte público', true),
(gen_random_uuid(), 'Saúde', 'Farmácia, médico, plano de saúde', true),
(gen_random_uuid(), 'Lazer', 'Cinema, shows, entretenimento', true),
(gen_random_uuid(), 'Contas', 'Luz, água, internet, telefone', true),
(gen_random_uuid(), 'Casa', 'Aluguel, condomínio, manutenção', true),
(gen_random_uuid(), 'Educação', 'Escola, cursos, livros', true),
(gen_random_uuid(), 'Investimentos', 'Aplicações, poupança', true),
(gen_random_uuid(), 'Outros', 'Gastos diversos', true);

-- 6. FUNÇÕES ÚTEIS
-- =====================================================

-- Função para gerar código de convite único
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(8) AS $$
DECLARE
    code VARCHAR(8);
    exists_count INTEGER;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
        SELECT COUNT(*) INTO exists_count FROM organizations WHERE invite_code = code;
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular gastos do mês
CREATE OR REPLACE FUNCTION get_monthly_expenses(
    p_organization_id UUID,
    p_month_year DATE
)
RETURNS TABLE (
    cost_center_id UUID,
    cost_center_name VARCHAR,
    total_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.name,
        COALESCE(SUM(e.amount), 0) as total_amount
    FROM cost_centers cc
    LEFT JOIN expenses e ON e.cost_center_id = cc.id 
        AND e.organization_id = p_organization_id
        AND e.status = 'confirmed'
        AND DATE_TRUNC('month', e.date) = DATE_TRUNC('month', p_month_year)
    WHERE cc.organization_id = p_organization_id
    GROUP BY cc.id, cc.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;
