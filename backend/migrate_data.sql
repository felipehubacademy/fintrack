-- =====================================================
-- MIGRAR DADOS EXISTENTES (EXECUTAR APÓS A MIGRAÇÃO)
-- =====================================================

-- 1. CRIAR ORGANIZAÇÃO PADRÃO
-- =====================================================

INSERT INTO organizations (id, name, admin_id, invite_code)
VALUES (
    gen_random_uuid(),
    'Família Xavier',
    gen_random_uuid(),
    generate_invite_code()
);

-- 2. CRIAR USUÁRIO PADRÃO
-- =====================================================

INSERT INTO users (id, email, name, phone, organization_id, role)
VALUES (
    gen_random_uuid(),
    'felipe@example.com',
    'Felipe Xavier',
    '+5511999999999',
    (SELECT id FROM organizations WHERE name = 'Família Xavier' LIMIT 1),
    'admin'
);

-- 3. CRIAR CENTROS DE CUSTO PADRÃO
-- =====================================================

INSERT INTO cost_centers (id, organization_id, name, type, color)
VALUES 
    (gen_random_uuid(), (SELECT id FROM organizations WHERE name = 'Família Xavier' LIMIT 1), 'Felipe', 'individual', '#3B82F6'),
    (gen_random_uuid(), (SELECT id FROM organizations WHERE name = 'Família Xavier' LIMIT 1), 'Letícia', 'individual', '#EC4899'),
    (gen_random_uuid(), (SELECT id FROM organizations WHERE name = 'Família Xavier' LIMIT 1), 'Compartilhado', 'shared', '#8B5CF6');

-- 4. MIGRAR DADOS EXISTENTES
-- =====================================================

-- Atualizar expenses existentes
UPDATE expenses SET
    organization_id = (SELECT id FROM organizations WHERE name = 'Família Xavier' LIMIT 1),
    user_id = (SELECT id FROM users WHERE email = 'felipe@example.com' LIMIT 1),
    cost_center_id = CASE 
        WHEN owner = 'Felipe' THEN (SELECT id FROM cost_centers WHERE name = 'Felipe' LIMIT 1)
        WHEN owner = 'Leticia' OR owner = 'Letícia' THEN (SELECT id FROM cost_centers WHERE name = 'Letícia' LIMIT 1)
        WHEN owner = 'Compartilhado' THEN (SELECT id FROM cost_centers WHERE name = 'Compartilhado' LIMIT 1)
        ELSE (SELECT id FROM cost_centers WHERE name = 'Felipe' LIMIT 1) -- Default para Felipe
    END,
    category_id = (SELECT id FROM budget_categories WHERE name = 'Outros' LIMIT 1),
    payment_method = CASE 
        WHEN source = 'pluggy' THEN 'credit_card'
        ELSE 'other'
    END
WHERE organization_id IS NULL;

-- 5. VERIFICAR MIGRAÇÃO
-- =====================================================

-- Mostrar estatísticas da migração
SELECT 
    'Organizações criadas' as tipo,
    COUNT(*) as quantidade
FROM organizations
UNION ALL
SELECT 
    'Usuários criados',
    COUNT(*)
FROM users
UNION ALL
SELECT 
    'Centros de custo criados',
    COUNT(*)
FROM cost_centers
UNION ALL
SELECT 
    'Despesas migradas',
    COUNT(*)
FROM expenses
WHERE organization_id IS NOT NULL;
