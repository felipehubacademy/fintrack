-- ============================================================================
-- Migration: Adicionar coluna onboarding_type na tabela onboarding_progress
-- Data: 2025-10-27
-- Descrição: Adiciona tipo de onboarding (solo, admin, invited)
-- ============================================================================

DO $$ 
BEGIN
    -- Adicionar coluna onboarding_type se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_progress' 
        AND column_name = 'onboarding_type'
    ) THEN
        ALTER TABLE onboarding_progress 
        ADD COLUMN onboarding_type VARCHAR(20) CHECK (onboarding_type IN ('solo', 'admin', 'invited'));
        
        RAISE NOTICE 'Coluna onboarding_type adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna onboarding_type já existe.';
    END IF;
END $$;

-- Comentário de documentação
COMMENT ON COLUMN onboarding_progress.onboarding_type IS 'Tipo de onboarding: solo (conta individual), admin (criou organização), invited (foi convidado)';

-- Verificação final
DO $$
BEGIN
    RAISE NOTICE '✅ Migration concluída: Coluna onboarding_type adicionada!';
    RAISE NOTICE '📊 Tipos disponíveis:';
    RAISE NOTICE '   - solo: Conta individual';
    RAISE NOTICE '   - admin: Criou organização familiar';
    RAISE NOTICE '   - invited: Foi convidado para organização';
END $$;

