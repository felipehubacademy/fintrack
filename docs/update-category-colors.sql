-- ============================================
-- ATUALIZAR CORES DAS CATEGORIAS EXISTENTES
-- ============================================

-- Atualizar cores das categorias existentes baseado no nome
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
    ELSE '#6366F1'
END;

-- Verificar as cores atualizadas
SELECT name, color FROM budget_categories ORDER BY name;
