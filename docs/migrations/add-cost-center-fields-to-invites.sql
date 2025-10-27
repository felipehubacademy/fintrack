-- ============================================================================
-- Migration: Adicionar campos de cost center em pending_invites
-- Data: 2025-10-27
-- Descrição: Permite definir split percentage e cor ao convidar usuário
-- ============================================================================

DO $$ 
BEGIN
  -- Adicionar coluna default_split_percentage se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' 
    AND column_name = 'default_split_percentage'
  ) THEN
    ALTER TABLE pending_invites 
    ADD COLUMN default_split_percentage DECIMAL(5,2) DEFAULT 50.00;
    
    RAISE NOTICE 'Coluna default_split_percentage adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna default_split_percentage já existe.';
  END IF;

  -- Adicionar coluna color se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pending_invites' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE pending_invites 
    ADD COLUMN color VARCHAR(7) DEFAULT '#6366F1';
    
    RAISE NOTICE 'Coluna color adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna color já existe.';
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN pending_invites.default_split_percentage IS 'Percentual de split padrão para o cost center do convidado';
COMMENT ON COLUMN pending_invites.color IS 'Cor do perfil para o cost center do convidado';

-- Verificação final
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída: Campos de cost center adicionados em pending_invites!';
  RAISE NOTICE '📊 Campos adicionados:';
  RAISE NOTICE '   - default_split_percentage: Percentual de split padrão';
  RAISE NOTICE '   - color: Cor do perfil';
END $$;

