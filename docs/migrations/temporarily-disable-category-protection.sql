-- ============================================
-- MIGRATION: Desabilitar temporariamente proteção de categorias padrão
-- ============================================
-- Descrição: Remove trigger e função que impedem deletar categorias padrão
--            para permitir limpeza de dados de teste
-- ============================================

-- 1. Remover trigger
DROP TRIGGER IF EXISTS trigger_prevent_default_category_deletion ON budget_categories;

-- 2. Remover função
DROP FUNCTION IF EXISTS prevent_default_category_deletion();

-- 3. Marcar apenas categorias GLOBAIS (sem organization_id) como padrão
-- Categorias de organizações específicas podem ser deletadas
UPDATE budget_categories 
SET is_default = FALSE 
WHERE organization_id IS NOT NULL;

-- 4. Verificar resultado
SELECT 
  name,
  is_default,
  organization_id
FROM budget_categories
ORDER BY organization_id, name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Proteção de categorias padrão desabilitada temporariamente';
  RAISE NOTICE 'Agora é possível deletar organizações e suas categorias';
  RAISE NOTICE 'Execute o script de reativação após a limpeza';
END $$;
