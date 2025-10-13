-- =====================================================
-- FINTRACK V2 - SCHEMA SIMPLIFICADO (SEM TRIGGERS)
-- =====================================================

-- 1. ORGANIZAÇÕES (Famílias/Empresas)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    admin_id UUID NOT NULL,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USUÁRIOS
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

-- 3. CENTROS DE CUSTO (Felipe, Letícia, Compartilhado, etc.)
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) DEFAULT 'individual' CHECK (type IN ('individual', 'shared', 'custom')),
    split_percentage DECIMAL(5,2) DEFAULT 100.00, -- Para compartilhado: 50.00
    color VARCHAR(7) DEFAULT '#3B82F6', -- Cor para UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CATEGORIAS DE ORÇAMENTO
CREATE TABLE budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false, -- Categorias padrão do sistema
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ORÇAMENTOS MENSAIS
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- 2025-10-01 para outubro/2025
    limit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    current_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, cost_center_id, category_id, month_year)
);

-- 6. DESPESAS (UNIFICADA - cartão + à vista)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
    
    -- Dados da despesa
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'other')),
    date DATE NOT NULL,
    
    -- Status e confirmação
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ignored')),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES users(id),
    
    -- WhatsApp
    whatsapp_message_id VARCHAR(255),
    conversation_state JSONB, -- Estado da conversa para continuidade
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. CONVITES PENDENTES
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

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_cost_centers_organization ON cost_centers(organization_id);
CREATE INDEX idx_expenses_organization ON expenses(organization_id);
CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_budgets_organization ON budgets(organization_id);
CREATE INDEX idx_budgets_month ON budgets(month_year);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
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

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Categorias padrão do sistema (sem organization_id para serem globais)
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
