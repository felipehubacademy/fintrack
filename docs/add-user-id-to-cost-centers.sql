-- Adicionar coluna user_id na tabela cost_centers para vincular usuários
-- Isso permite mapear "Eu" para o cost center correto do usuário

-- 1. Adicionar coluna user_id (opcional, pode ser NULL)
ALTER TABLE cost_centers 
ADD COLUMN user_id UUID REFERENCES users(id);

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id ON cost_centers(user_id);

-- 3. Atualizar cost centers existentes baseado no nome
-- (assumindo que o nome do cost center é igual ao primeiro nome do usuário)
UPDATE cost_centers 
SET user_id = u.id
FROM users u
WHERE cost_centers.name = SPLIT_PART(u.name, ' ', 1)
  AND cost_centers.organization_id = u.organization_id
  AND cost_centers.type = 'individual';

-- 4. Comentário para documentação
COMMENT ON COLUMN cost_centers.user_id IS 'Vincula cost center individual ao usuário específico (para mapear "Eu")';
