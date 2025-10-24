-- ============================================
-- REMOVER COLUNA ICON DE BUDGET_CATEGORIES
-- ============================================

-- Remover coluna icon se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'budget_categories' 
        AND column_name = 'icon'
    ) THEN
        ALTER TABLE budget_categories DROP COLUMN icon;
        RAISE NOTICE 'Coluna icon removida de budget_categories';
    ELSE
        RAISE NOTICE 'Coluna icon não existe em budget_categories';
    END IF;
END
$$;

-- Limpar comentários relacionados
COMMENT ON TABLE budget_categories IS 'Categorias de orçamento e despesas';

