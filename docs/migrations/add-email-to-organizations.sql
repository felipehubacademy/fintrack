-- ============================================================================
-- MIGRATION: Adicionar coluna email à tabela organizations
-- Description: Adicionar email para identificação única de organizações
-- Date: 2025-10-23
-- ============================================================================

-- 1. Adicionar coluna email à tabela organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. Adicionar constraint único para email de organizações
ALTER TABLE organizations 
ADD CONSTRAINT unique_organization_email UNIQUE (email);

-- 3. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email);

-- 4. Adicionar comentário
COMMENT ON COLUMN organizations.email IS 'Email único da organização para identificação e comunicação';

-- 5. Verificar se a coluna foi adicionada
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'organizations' 
  AND column_name = 'email';

-- 6. Verificar se a constraint foi criada
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname = 'unique_organization_email';
