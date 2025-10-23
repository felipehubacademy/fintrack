-- Migration: Create trigger to auto-link cost centers when user accepts invite
-- Description: Automatically link cost_center to user when they join organization
-- Date: 2025-10-22

-- 1. Criar função que vincula cost_center ao usuário
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

-- 2. Criar trigger para executar após inserir em organization_members
DROP TRIGGER IF EXISTS trigger_auto_link_cost_center ON organization_members;

CREATE TRIGGER trigger_auto_link_cost_center
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_cost_center_to_user();

-- 3. Criar função para criar cost_center automaticamente para members/admins
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

-- 4. Criar trigger para executar após inserir em organization_members
DROP TRIGGER IF EXISTS trigger_auto_create_cost_center ON organization_members;

CREATE TRIGGER trigger_auto_create_cost_center
  AFTER INSERT ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_cost_center_for_user();

-- 5. Adicionar comentários
COMMENT ON FUNCTION auto_link_cost_center_to_user() IS 'Vincula automaticamente cost_center ao usuário quando ele aceita convite';
COMMENT ON FUNCTION auto_create_cost_center_for_user() IS 'Cria automaticamente cost_center para admin/member quando entram na organização';

