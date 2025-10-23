-- Migration: Update cost_centers structure
-- Description: Remove type, add linked_email, rename split_percentage to default_split_percentage
-- Date: 2025-10-22

-- 1. Remover coluna 'type'
ALTER TABLE cost_centers 
DROP COLUMN IF EXISTS type;

-- 2. Renomear 'split_percentage' para 'default_split_percentage'
ALTER TABLE cost_centers 
RENAME COLUMN split_percentage TO default_split_percentage;

-- 3. Adicionar coluna 'linked_email' para vincular automaticamente
ALTER TABLE cost_centers 
ADD COLUMN IF NOT EXISTS linked_email VARCHAR(255);

-- 4. Adicionar índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_cost_centers_linked_email 
ON cost_centers(linked_email) 
WHERE linked_email IS NOT NULL;

-- 5. Adicionar índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id 
ON cost_centers(user_id) 
WHERE user_id IS NOT NULL;

-- 6. Atualizar constraint de percentual (permitir 0-100%)
ALTER TABLE cost_centers 
DROP CONSTRAINT IF EXISTS check_split_percentage;

ALTER TABLE cost_centers 
ADD CONSTRAINT check_default_split_percentage 
CHECK (default_split_percentage >= 0 AND default_split_percentage <= 100);

-- 7. Adicionar comentários
COMMENT ON COLUMN cost_centers.default_split_percentage IS 'Percentual padrão sugerido para despesas compartilhadas (pode ser ajustado por despesa)';
COMMENT ON COLUMN cost_centers.linked_email IS 'Email para vincular automaticamente quando usuário aceitar convite';
COMMENT ON COLUMN cost_centers.user_id IS 'ID do usuário vinculado (NULL se centro não vinculado)';

