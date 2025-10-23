-- ============================================
-- MIGRATION: Reativar proteção de categorias padrão
-- ============================================
-- Descrição: Reativa trigger e função que impedem deletar categorias padrão
--            após limpeza de dados de teste
-- ============================================

-- 1. Recriar função para impedir deleção de categorias padrão GLOBAIS
CREATE OR REPLACE FUNCTION prevent_default_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Só impede deleção se for categoria padrão GLOBAL (sem organization_id)
  IF OLD.is_default = TRUE AND OLD.organization_id IS NULL THEN
    RAISE EXCEPTION 'Não é possível excluir categorias padrão globais do sistema';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar trigger para executar antes de DELETE
CREATE TRIGGER trigger_prevent_default_category_deletion
  BEFORE DELETE ON budget_categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_category_deletion();

-- 3. Marcar apenas categorias GLOBAIS como padrão
-- Categorias de organizações específicas NÃO são protegidas
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
) AND organization_id IS NULL; -- APENAS categorias globais do sistema

-- 4. Adicionar comentários
COMMENT ON FUNCTION prevent_default_category_deletion() IS 'Impede deleção de categorias padrão do sistema';
COMMENT ON TRIGGER trigger_prevent_default_category_deletion ON budget_categories IS 'Trigger que executa antes de DELETE para verificar se categoria é padrão';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Proteção de categorias padrão reativada';
  RAISE NOTICE 'Categorias padrão do sistema não podem mais ser deletadas';
END $$;
