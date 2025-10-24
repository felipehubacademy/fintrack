-- ============================================
-- ADICIONAR COLUNA is_shared NA TABELA BILLS
-- ============================================
-- Script simplificado para adicionar apenas a coluna is_shared

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

-- 4. Teste: Inserir uma conta compartilhada de teste
-- (Descomente para testar)
/*
INSERT INTO bills (
    organization_id,
    user_id,
    description,
    amount,
    due_date,
    is_shared
) VALUES (
    '092adfb3-41d8-4006-bfa5-7035338560e9',
    (SELECT id FROM users WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9' LIMIT 1),
    'Teste Conta Compartilhada',
    100.00,
    '2025-11-15',
    true
);
*/
