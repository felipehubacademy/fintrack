-- Migration: Corrigir trigger para evitar duplicação de cost centers
-- Data: 2025-10-23
-- Descrição: Não criar cost center automaticamente se já existe um vinculado ao email do usuário

-- Recriar função com verificação de linked_email
CREATE OR REPLACE FUNCTION auto_create_cost_center_for_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name VARCHAR(255);
  user_email VARCHAR(255);
  existing_count INTEGER;
BEGIN
  -- Apenas criar cost_center para admin e member (não para viewer)
  IF NEW.role IN ('admin', 'member') THEN
    -- Buscar nome e email do usuário
    SELECT name, email INTO user_name, user_email
    FROM users
    WHERE id = NEW.id;

    -- Verificar se já existe cost_center vinculado a este email (via linked_email OU user_id)
    SELECT COUNT(*) INTO existing_count
    FROM cost_centers 
    WHERE organization_id = NEW.organization_id
      AND (user_id = NEW.id OR linked_email = user_email);

    -- Só criar se não existir nenhum cost_center vinculado
    IF existing_count = 0 THEN
      INSERT INTO cost_centers (organization_id, name, default_split_percentage, user_id, linked_email, is_active)
      VALUES (NEW.organization_id, user_name, 50.00, NEW.id, user_email, TRUE);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION auto_create_cost_center_for_user() IS 
'Cria cost center automaticamente apenas se não existir um já vinculado ao email do usuário';

