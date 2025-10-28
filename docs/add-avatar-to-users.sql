-- Adicionar coluna avatar_url à tabela users para armazenar URL do avatar no Supabase Storage
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentário para documentação
COMMENT ON COLUMN users.avatar_url IS 'URL do avatar do usuário armazenado no Supabase Storage bucket avatars';

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'avatar_url';

