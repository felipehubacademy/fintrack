-- ============================================================================
-- VALIDAÇÕES: Adicionar constraints únicos para evitar duplicação
-- ============================================================================

-- 1. Adicionar constraint único para EMAIL na tabela users
-- Isso impede que o mesmo email seja usado por múltiplos usuários
ALTER TABLE users 
ADD CONSTRAINT unique_user_email UNIQUE (email);

-- 2. Adicionar constraint único para PHONE na tabela users
-- Isso impede que o mesmo telefone seja usado por múltiplos usuários
ALTER TABLE users 
ADD CONSTRAINT unique_user_phone UNIQUE (phone);

-- 3. Adicionar constraint único para EMAIL na tabela organizations
-- Isso impede que o mesmo email seja usado por múltiplas organizações
-- NOTA: Execute primeiro o script add-email-to-organizations.sql
ALTER TABLE organizations 
ADD CONSTRAINT unique_organization_email UNIQUE (email);

-- 4. Verificar se as constraints foram criadas
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname IN (
  'unique_user_email',
  'unique_user_phone',
  'unique_organization_email'
)
ORDER BY conname;
