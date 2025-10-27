-- ============================================================================
-- Migration: Adicionar colunas type e token na tabela verification_codes
-- Data: 2025-10-27
-- Descrição: Adiciona type (tipo de verificação) e token (para link alternativo)
-- ============================================================================

DO $$ 
BEGIN
    -- Adicionar coluna type se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verification_codes' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE verification_codes 
        ADD COLUMN type VARCHAR(20);
        
        RAISE NOTICE 'Coluna type adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna type já existe.';
    END IF;

    -- Adicionar coluna token se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verification_codes' 
        AND column_name = 'token'
    ) THEN
        ALTER TABLE verification_codes 
        ADD COLUMN token VARCHAR(64) UNIQUE;
        
        -- Criar índice para token
        CREATE INDEX IF NOT EXISTS idx_verification_codes_token ON verification_codes(token);
        
        RAISE NOTICE 'Coluna token adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna token já existe.';
    END IF;
END $$;

-- Comentários de documentação
COMMENT ON COLUMN verification_codes.type IS 'Tipo de verificação: whatsapp_code ou whatsapp_link';
COMMENT ON COLUMN verification_codes.token IS 'Token único para verificação via link alternativo (opcional)';

-- Verificação final
DO $$
BEGIN
    RAISE NOTICE '✅ Migration concluída: Colunas type e token adicionadas!';
    RAISE NOTICE '📊 Tabela verification_codes agora possui:';
    RAISE NOTICE '   - type (VARCHAR(20))';
    RAISE NOTICE '   - token (VARCHAR(64) UNIQUE)';
END $$;

