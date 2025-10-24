-- ============================================
-- CORRIGIR CORES DAS CATEGORIAS DO MARCO
-- ============================================
-- Organization ID: c30389a9-0842-404f-b782-f46f30385618

-- Atualizar cores das categorias padrão do Marco baseado no nome
UPDATE budget_categories 
SET color = CASE 
    WHEN name = 'Alimentação' THEN '#EF4444'
    WHEN name = 'Transporte' THEN '#F59E0B'
    WHEN name = 'Saúde' THEN '#10B981'
    WHEN name = 'Lazer' THEN '#8B5CF6'
    WHEN name = 'Contas' THEN '#06B6D4'
    WHEN name = 'Casa' THEN '#8B5A2B'
    WHEN name = 'Educação' THEN '#EC4899'
    WHEN name = 'Investimentos' THEN '#10B981'
    WHEN name = 'Outros' THEN '#6B7280'
    ELSE color
END
WHERE organization_id = 'c30389a9-0842-404f-b782-f46f30385618'
AND is_default = true;

-- Verificar as cores atualizadas
SELECT id, name, color, is_default, created_at 
FROM budget_categories 
WHERE organization_id = 'c30389a9-0842-404f-b782-f46f30385618'
ORDER BY name;

