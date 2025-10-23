-- Migration: Add roles to organization_members
-- Description: Add role column (admin, member, viewer) to organization_members
-- Date: 2025-10-22

-- 1. Criar tipo ENUM para roles
DO $$ BEGIN
  CREATE TYPE organization_role AS ENUM ('admin', 'member', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar coluna 'role' (default: member)
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS role organization_role DEFAULT 'member';

-- 3. Atualizar membros existentes que são owners para admin
UPDATE organization_members 
SET role = 'admin' 
WHERE is_owner = true;

-- 4. Adicionar índice para busca por role
CREATE INDEX IF NOT EXISTS idx_organization_members_role 
ON organization_members(role);

-- 5. Adicionar comentários
COMMENT ON COLUMN organization_members.role IS 'Função do membro: admin (acesso total), member (pode criar despesas), viewer (apenas visualiza)';

-- 6. Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_organization_admin(user_id_param UUID, org_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE user_id = user_id_param 
      AND organization_id = org_id_param 
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar função para verificar se usuário é member ou admin
CREATE OR REPLACE FUNCTION can_create_expenses(user_id_param UUID, org_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE user_id = user_id_param 
      AND organization_id = org_id_param 
      AND role IN ('admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

