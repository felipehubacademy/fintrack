-- ============================================================================
-- Migration: Adicionar colunas de verificação
-- Data: 2025-10-27
-- Descrição: Adiciona todas as colunas necessárias para verificação de telefone
-- ============================================================================

-- ============================================================================
-- TABELA: users
-- ============================================================================

DO $$ 
BEGIN
    -- Adicionar coluna verification_attempts se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verification_attempts'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN verification_attempts INTEGER DEFAULT 0;
        
        RAISE NOTICE 'Coluna users.verification_attempts adicionada!';
    ELSE
        RAISE NOTICE 'Coluna users.verification_attempts já existe.';
    END IF;

    -- Adicionar coluna last_verification_attempt se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'last_verification_attempt'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN last_verification_attempt TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Coluna users.last_verification_attempt adicionada!';
    ELSE
        RAISE NOTICE 'Coluna users.last_verification_attempt já existe.';
    END IF;

    -- Adicionar coluna phone_verified_at se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone_verified_at'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN phone_verified_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Coluna users.phone_verified_at adicionada!';
    ELSE
        RAISE NOTICE 'Coluna users.phone_verified_at já existe.';
    END IF;
END $$;

-- ============================================================================
-- TABELA: verification_codes
-- ============================================================================

DO $$ 
BEGIN
    -- Adicionar coluna used_at se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'verification_codes' 
        AND column_name = 'used_at'
    ) THEN
        ALTER TABLE verification_codes 
        ADD COLUMN used_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Coluna verification_codes.used_at adicionada!';
    ELSE
        RAISE NOTICE 'Coluna verification_codes.used_at já existe.';
    END IF;
END $$;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON COLUMN users.verification_attempts IS 'Número de tentativas de verificação (rate limiting)';
COMMENT ON COLUMN users.last_verification_attempt IS 'Data e hora da última tentativa de verificação';
COMMENT ON COLUMN users.phone_verified_at IS 'Data e hora da verificação do telefone';
COMMENT ON COLUMN verification_codes.used_at IS 'Data e hora em que o código foi usado';

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration concluída!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TABELA users:';
    RAISE NOTICE '   ✓ verification_attempts (INTEGER, DEFAULT 0)';
    RAISE NOTICE '   ✓ last_verification_attempt (TIMESTAMP WITH TIME ZONE)';
    RAISE NOTICE '   ✓ phone_verified_at (TIMESTAMP WITH TIME ZONE)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TABELA verification_codes:';
    RAISE NOTICE '   ✓ used_at (TIMESTAMP WITH TIME ZONE)';
END $$;

