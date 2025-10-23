-- ============================================================================
-- MIGRATION: Complete Cost Center Refactor
-- Description: Atualiza estrutura de cost_centers e adiciona roles
-- Date: 2025-10-22
-- Execute no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PARTE 1: Atualizar tabela cost_centers
-- ============================================================================

-- 1.1. Remover coluna 'type' (se existir)
ALTER TABLE cost_centers 
DROP COLUMN IF EXISTS type;

-- 1.2. Adicionar coluna 'linked_email' para vincular automaticamente
ALTER TABLE cost_centers 
ADD COLUMN IF NOT EXISTS linked_email VARCHAR(255);

-- 1.3. Adicionar índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_cost_centers_linked_email 
ON cost_centers(linked_email) 
WHERE linked_email IS NOT NULL;

-- 1.4. Adicionar índice para busca por user_id
CREATE INDEX IF NOT EXISTS idx_cost_centers_user_id 
ON cost_centers(user_id) 
WHERE user_id IS NOT NULL;

-- 1.5. Garantir que constraint de percentual existe (0-100%)
-- Nota: Se já existir, não faz nada
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_default_split_percentage'
  ) THEN
    ALTER TABLE cost_centers 
    ADD CONSTRAINT check_default_split_percentage 
    CHECK (default_split_percentage >= 0 AND default_split_percentage <= 100);
  END IF;
END $$;

-- 1.6. Adicionar comentários
COMMENT ON COLUMN cost_centers.default_split_percentage IS 'Percentual padrão sugerido para despesas compartilhadas (pode ser ajustado por despesa)';
COMMENT ON COLUMN cost_centers.linked_email IS 'Email para vincular automaticamente quando usuário aceitar convite';
COMMENT ON COLUMN cost_centers.user_id IS 'ID do usuário vinculado (NULL se centro não vinculado)';

-- ============================================================================
-- PARTE 2: Atualizar roles na tabela users
-- ============================================================================

-- 2.1. Remover constraint antiga de role
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

-- 2.2. Adicionar nova constraint com 'viewer'
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'member', 'viewer'));

-- 2.3. Adicionar índice para busca por role
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- 2.4. Adicionar comentários
COMMENT ON COLUMN users.role IS 'Função do membro: admin (acesso total), member (pode criar despesas), viewer (apenas visualiza)';

-- 2.5. Criar função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_organization_admin(user_id_param UUID, org_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = user_id_param 
      AND organization_id = org_id_param 
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.6. Criar função para verificar se usuário é member ou admin
CREATE OR REPLACE FUNCTION can_create_expenses(user_id_param UUID, org_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = user_id_param 
      AND organization_id = org_id_param 
      AND role IN ('admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 3: Triggers para auto-link e auto-create cost centers
-- ============================================================================

-- 3.1. Criar função que vincula cost_center ao usuário
CREATE OR REPLACE FUNCTION auto_link_cost_center_to_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email VARCHAR(255);
BEGIN
  -- Buscar email do usuário
  SELECT email INTO user_email
  FROM users
  WHERE id = NEW.user_id;

  -- Se encontrou email, tentar vincular cost_centers pendentes
  IF user_email IS NOT NULL THEN
    UPDATE cost_centers
    SET user_id = NEW.user_id,
        updated_at = NOW()
    WHERE organization_id = NEW.organization_id
      AND linked_email = user_email
      AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2. Criar trigger para executar quando usuário atualiza organization_id
-- (quando aceita convite e entra na organização)
DROP TRIGGER IF EXISTS trigger_auto_link_cost_center ON users;

CREATE TRIGGER trigger_auto_link_cost_center
  AFTER UPDATE OF organization_id ON users
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION auto_link_cost_center_to_user();

-- 3.3. Criar função para criar cost_center automaticamente para members/admins
CREATE OR REPLACE FUNCTION auto_create_cost_center_for_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name VARCHAR(255);
  user_email VARCHAR(255);
BEGIN
  -- Apenas criar cost_center para admin e member (não para viewer)
  IF NEW.role IN ('admin', 'member') THEN
    -- Buscar nome e email do usuário
    SELECT name, email INTO user_name, user_email
    FROM users
    WHERE id = NEW.user_id;

    -- Criar cost_center se não existir um vinculado a este usuário
    IF NOT EXISTS (
      SELECT 1 FROM cost_centers 
      WHERE organization_id = NEW.organization_id 
        AND user_id = NEW.user_id
    ) THEN
      INSERT INTO cost_centers (
        organization_id,
        name,
        user_id,
        linked_email,
        default_split_percentage,
        color,
        is_active
      ) VALUES (
        NEW.organization_id,
        COALESCE(user_name, 'Novo Membro'),
        NEW.user_id,
        user_email,
        50.00, -- Percentual padrão
        '#3B82F6', -- Azul padrão
        true
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.4. Criar trigger para executar quando usuário entra na organização
DROP TRIGGER IF EXISTS trigger_auto_create_cost_center ON users;

CREATE TRIGGER trigger_auto_create_cost_center
  AFTER UPDATE OF organization_id ON users
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION auto_create_cost_center_for_user();

-- 3.5. Adicionar comentários
COMMENT ON FUNCTION auto_link_cost_center_to_user() IS 'Vincula automaticamente cost_center ao usuário quando ele aceita convite';
COMMENT ON FUNCTION auto_create_cost_center_for_user() IS 'Cria automaticamente cost_center para admin/member quando entram na organização';

-- ============================================================================
-- PARTE 4: Atualizar dados existentes
-- ============================================================================

-- 4.1. Atualizar cost_centers existentes para vincular com email
UPDATE cost_centers cc
SET linked_email = u.email
FROM users u
WHERE cc.user_id = u.id
  AND cc.linked_email IS NULL;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

-- Verificar resultado
SELECT 
  'cost_centers' as table_name,
  COUNT(*) as total_records,
  COUNT(user_id) as with_user,
  COUNT(linked_email) as with_email
FROM cost_centers
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'member' THEN 1 END) as members
FROM users;

