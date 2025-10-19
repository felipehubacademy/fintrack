-- ============================================
-- ADICIONAR COLUNA COLOR À TABELA BUDGET_CATEGORIES
-- ============================================

-- Adicionar coluna color na tabela budget_categories
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6366F1';

-- Atualizar categorias existentes com cores padrão
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
END
WHERE color IS NULL;

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'budget_categories' 
AND column_name = 'color';
