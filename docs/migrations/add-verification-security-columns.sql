-- ============================================================================
-- Migration: Adicionar colunas de segurança na tabela verification_codes
-- Data: 2025-10-27
-- Descrição: Adiciona ip_address e user_agent para rastreamento de segurança
-- ============================================================================

DO $$ 
BEGIN
    -- Adicionar coluna ip_address se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verification_codes' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE verification_codes 
        ADD COLUMN ip_address VARCHAR(45);
        
        RAISE NOTICE 'Coluna ip_address adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna ip_address já existe.';
    END IF;

    -- Adicionar coluna user_agent se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verification_codes' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE verification_codes 
        ADD COLUMN user_agent TEXT;
        
        RAISE NOTICE 'Coluna user_agent adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna user_agent já existe.';
    END IF;
END $$;

-- Comentários de documentação
COMMENT ON COLUMN verification_codes.ip_address IS 'Endereço IP de origem da requisição (para segurança e detecção de fraudes)';
COMMENT ON COLUMN verification_codes.user_agent IS 'User agent do navegador/dispositivo (para segurança e debugging)';

-- Verificação final
DO $$
BEGIN
    RAISE NOTICE '✅ Migration concluída: Colunas de segurança adicionadas!';
    RAISE NOTICE '📊 Tabela verification_codes agora possui:';
    RAISE NOTICE '   - ip_address (VARCHAR(45))';
    RAISE NOTICE '   - user_agent (TEXT)';
END $$;

