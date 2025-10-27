-- ============================================================================
-- REMOVER whatsapp_phone E USAR APENAS CATEGORIAS GLOBAIS
-- ============================================================================
-- Data: 2025-01-27
-- Descrição: Remove coluna não utilizada e muda para usar apenas categorias globais
-- ============================================================================

-- Remover coluna whatsapp_phone (não utilizada)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'users' AND column_name = 'whatsapp_phone') THEN
    ALTER TABLE users DROP COLUMN whatsapp_phone;
    RAISE NOTICE 'Coluna whatsapp_phone removida';
  END IF;
END $$;

-- NOTA: Não precisamos deletar as categorias por org existentes
-- Elas ficarão como "legacy" e serão ignoradas pelo código
-- Se quiser limpar (opcional):
-- DELETE FROM budget_categories WHERE organization_id IS NOT NULL AND is_default = true;

-- NOVO PROCESSO:
-- 1. Código em create-account.jsx e create-organization.jsx não criará mais categorias
-- 2. Código buscará APENAS categorias globais (organization_id IS NULL)
-- 3. Usuários podem criar categorias customizadas depois (com organization_id da org)

SELECT '✅ Migração concluída!' as status;

