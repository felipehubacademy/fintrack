-- ============================================================================
-- Migration: Adicionar categoria nas entradas (incomes)
-- Data: 16/11/2025
-- Descrição: Adiciona coluna category_id para vincular entradas às categorias
--            de budget_categories do tipo 'income'
-- ============================================================================

-- Adicionar coluna category_id
ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS category_id UUID NULL 
REFERENCES budget_categories(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_incomes_category 
ON incomes(category_id);

-- Adicionar comentário
COMMENT ON COLUMN incomes.category_id IS 
'Categoria da entrada (referência para budget_categories do tipo income)';

