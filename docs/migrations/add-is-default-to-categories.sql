-- ============================================
-- MIGRATION: Adicionar proteção para categorias padrão
-- ============================================
-- Descrição: Adiciona coluna is_default e constraint para impedir
--            deleção de categorias padrão do sistema
-- ============================================

-- 1. Adicionar coluna is_default
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- 2. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_budget_categories_is_default 
ON budget_categories(is_default) 
WHERE is_default = TRUE;

-- 3. Marcar categorias padrão existentes
UPDATE budget_categories 
SET is_default = TRUE 
WHERE name IN (
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Contas',
  'Casa',
  'Educação',
  'Investimentos',
  'Outros'
);

-- 4. Criar função para impedir deleção de categorias padrão
CREATE OR REPLACE FUNCTION prevent_default_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = TRUE THEN
    RAISE EXCEPTION 'Não é possível excluir categorias padrão do sistema';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para executar antes de DELETE
DROP TRIGGER IF EXISTS trigger_prevent_default_category_deletion ON budget_categories;

CREATE TRIGGER trigger_prevent_default_category_deletion
  BEFORE DELETE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_category_deletion();

-- 6. Adicionar comentários
COMMENT ON COLUMN budget_categories.is_default IS 'Indica se é uma categoria padrão do sistema (não pode ser deletada)';
COMMENT ON FUNCTION prevent_default_category_deletion() IS 'Impede deleção de categorias padrão';

-- 7. Verificar resultado
SELECT 
  name,
  is_default,
  COUNT(*) OVER (PARTITION BY is_default) as total_por_tipo
FROM budget_categories
ORDER BY is_default DESC, name;

