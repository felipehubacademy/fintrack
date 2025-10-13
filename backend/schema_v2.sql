-- =====================================================
-- FINTRACK V2 - SCHEMA MULTI-USUÁRIO
-- =====================================================

-- 1. ORGANIZAÇÕES (Famílias/Empresas)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    admin_id UUID NOT NULL,
    invite_code VARCHAR(8) UNIQUE NOT NULL, -- Código único para convites
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
-- FUNÇÕES ÚTEIS
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

-- Função para validar limite de centros de custo (máximo 5)
CREATE OR REPLACE FUNCTION validate_cost_centers_limit()
RETURNS TRIGGER AS $$
DECLARE
    center_count INTEGER;
BEGIN
    -- Contar centros de custo ativos da organização
    SELECT COUNT(*) INTO center_count 
    FROM cost_centers 
    WHERE organization_id = NEW.organization_id 
    AND is_active = true;
    
    -- Se for update, não contar o próprio registro
    IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
        center_count := center_count - 1;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true THEN
        center_count := center_count + 1;
    ELSIF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        center_count := center_count + 1;
    END IF;
    
    -- Verificar limite
    IF center_count > 5 THEN
        RAISE EXCEPTION 'Limite máximo de 5 centros de custo por organização atingido';
    END IF;
    
    RETURN NEW;
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

-- =====================================================
-- DADOS INICIAIS
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

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para validar limite de centros de custo
CREATE TRIGGER validate_cost_centers_limit_trigger
    BEFORE INSERT OR UPDATE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION validate_cost_centers_limit();
