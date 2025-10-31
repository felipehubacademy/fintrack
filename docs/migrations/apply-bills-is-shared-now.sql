-- ============================================
-- APLICAR COLUNA is_shared NA TABELA BILLS
-- ============================================
-- Execute este script no Supabase SQL Editor para adicionar a coluna is_shared

-- 1. Adicionar coluna is_shared na tabela bills
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- 2. Adicionar comentário
COMMENT ON COLUMN bills.is_shared IS 'Se true, conta é compartilhada entre todos os responsáveis financeiros';

-- 3. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bills' 
AND table_schema = 'public'
AND column_name = 'is_shared';

-- Pronto! A coluna is_shared agora está disponível na tabela bills.

