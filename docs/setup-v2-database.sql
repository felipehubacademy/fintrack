-- ============================================
-- FINTRACK V2 - SETUP RESPETANDO DADOS EXISTENTES
-- ============================================

-- 1. Verificar tabelas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('expenses', 'organizations', 'users', 'cost_centers', 'budget_categories', 'budgets');

-- 2. Criar tabelas V2 apenas se não existirem
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS pending_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 3. Adicionar colunas V2 na tabela expenses (se não existirem)
DO $$ 
BEGIN
    -- Adicionar colunas V2 se não existirem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'organization_id') THEN
        ALTER TABLE expenses ADD COLUMN organization_id UUID REFERENCES organizations(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id') THEN
        ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'cost_center_id') THEN
        ALTER TABLE expenses ADD COLUMN cost_center_id UUID REFERENCES cost_centers(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'category_id') THEN
        ALTER TABLE expenses ADD COLUMN category_id UUID REFERENCES budget_categories(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'payment_method') THEN
        ALTER TABLE expenses ADD COLUMN payment_method VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'conversation_state') THEN
        ALTER TABLE expenses ADD COLUMN conversation_state JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'confirmed_by') THEN
        ALTER TABLE expenses ADD COLUMN confirmed_by UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'whatsapp_message_id') THEN
        ALTER TABLE expenses ADD COLUMN whatsapp_message_id VARCHAR(255);
    END IF;
END $$;

-- 4. Função para validar limite de centros de custo
DROP FUNCTION IF EXISTS validate_cost_centers_limit();
CREATE OR REPLACE FUNCTION validate_cost_centers_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM cost_centers WHERE organization_id = NEW.organization_id AND is_active = true) >= 5 THEN
        RAISE EXCEPTION 'Limite máximo de 5 centros de custo ativos por organização';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para validar limite
DROP TRIGGER IF EXISTS check_cost_centers_limit ON cost_centers;
CREATE TRIGGER check_cost_centers_limit
    BEFORE INSERT ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION validate_cost_centers_limit();

-- 6. Função para gerar código de convite
DROP FUNCTION IF EXISTS generate_invite_code();
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invite_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para gerar código automaticamente
DROP TRIGGER IF EXISTS generate_invite_code_trigger ON pending_invites;
CREATE TRIGGER generate_invite_code_trigger
    BEFORE INSERT ON pending_invites
    FOR EACH ROW
    EXECUTE FUNCTION generate_invite_code();

-- 8. Função para buscar despesas mensais
DROP FUNCTION IF EXISTS get_monthly_expenses(UUID, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_monthly_expenses(org_id UUID, target_month INTEGER, target_year INTEGER)
RETURNS TABLE (
    cost_center_name VARCHAR(100),
    category_name VARCHAR(100),
    total_amount DECIMAL(10,2),
    expense_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(cc.name, 'Não definido') as cost_center_name,
        COALESCE(bc.name, 'Não definido') as category_name,
        SUM(e.amount) as total_amount,
        COUNT(*) as expense_count
    FROM expenses e
    LEFT JOIN cost_centers cc ON e.cost_center_id = cc.id
    LEFT JOIN budget_categories bc ON e.category_id = bc.id
    WHERE e.organization_id = org_id
        AND EXTRACT(MONTH FROM e.date) = target_month
        AND EXTRACT(YEAR FROM e.date) = target_year
        AND e.status = 'confirmed'
    GROUP BY cc.name, bc.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. Configurar RLS (Row Level Security) - DESABILITADO para facilitar desenvolvimento
-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- 10. Criar organização padrão e dados iniciais
INSERT INTO organizations (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'FinTrack V1 Migration')
ON CONFLICT (id) DO NOTHING;

-- 11. Criar usuário padrão
INSERT INTO users (id, organization_id, email, phone, name, role) 
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    '00000000-0000-0000-0000-000000000001',
    'admin@fintrack.com',
    '5511978229898',
    'Administrador',
    'admin'
)
ON CONFLICT (id) DO NOTHING;

-- 12. Criar centros de custo padrão
INSERT INTO cost_centers (id, organization_id, name, color) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Felipe', '#3B82F6'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Letícia', '#EF4444'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Compartilhado', '#10B981')
ON CONFLICT (id) DO NOTHING;

-- 13. Criar categorias de orçamento padrão
INSERT INTO budget_categories (id, organization_id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Alimentação', 'Supermercado, restaurantes, delivery'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Transporte', 'Gasolina, Uber, transporte público'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Saúde', 'Farmácia, médico, exames'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Lazer', 'Cinema, viagens, entretenimento'),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Contas', 'Luz, água, internet, telefone'),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Casa', 'Aluguel, manutenção, móveis'),
    ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Educação', 'Cursos, livros, material escolar'),
    ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Investimentos', 'Aplicações, poupança'),
    ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Outros', 'Gastos diversos')
ON CONFLICT (id) DO NOTHING;

-- 14. Migrar despesas existentes para V2 (atualizar com organização padrão)
UPDATE expenses 
SET organization_id = '00000000-0000-0000-0000-000000000001',
    user_id = '00000000-0000-0000-0000-000000000001',
    cost_center_id = CASE 
        WHEN owner = 'Felipe' THEN '00000000-0000-0000-0000-000000000001'
        WHEN owner = 'Letícia' THEN '00000000-0000-0000-0000-000000000002'
        ELSE '00000000-0000-0000-0000-000000000003'
    END,
    category_id = CASE 
        WHEN category = 'Alimentação' THEN '00000000-0000-0000-0000-000000000001'
        WHEN category = 'Transporte' THEN '00000000-0000-0000-0000-000000000002'
        WHEN category = 'Saúde' THEN '00000000-0000-0000-0000-000000000003'
        WHEN category = 'Lazer' THEN '00000000-0000-0000-0000-000000000004'
        WHEN category = 'Contas' THEN '00000000-0000-0000-0000-000000000005'
        WHEN category = 'Casa' THEN '00000000-0000-0000-0000-000000000006'
        WHEN category = 'Educação' THEN '00000000-0000-0000-0000-000000000007'
        WHEN category = 'Investimentos' THEN '00000000-0000-0000-0000-000000000008'
        ELSE '00000000-0000-0000-0000-000000000009'
    END
WHERE organization_id IS NULL;

-- 15. Verificar resultado da migração
SELECT 
    'Organizations' as table_name,
    COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
    'Users' as table_name,
    COUNT(*) as count
FROM users
UNION ALL
SELECT 
    'Cost Centers' as table_name,
    COUNT(*) as count
FROM cost_centers
UNION ALL
SELECT 
    'Budget Categories' as table_name,
    COUNT(*) as count
FROM budget_categories
UNION ALL
SELECT 
    'Expenses (V2)' as table_name,
    COUNT(*) as count
FROM expenses 
WHERE organization_id IS NOT NULL;

-- 16. Mostrar estatísticas
SELECT 
    'Setup V2 concluído!' as status,
    'Estrutura V2 criada e dados V1 migrados' as message;
