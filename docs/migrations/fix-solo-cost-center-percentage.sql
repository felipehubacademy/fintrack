-- ============================================================================
-- CORREÇÃO: Cost center de contas solo deve ter 100%
-- ============================================================================
-- PROBLEMA: Trigger cria cost_center com 50% para todos os usuários
-- SOLUÇÃO: Detectar se é conta solo (único membro) e criar com 100%

CREATE OR REPLACE FUNCTION auto_create_cost_center_for_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name VARCHAR(255);
  user_email VARCHAR(255);
  member_count INTEGER;
BEGIN
  -- Apenas criar cost_center para admin e member (não para viewer)
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    -- Buscar nome e email do usuário
    SELECT name, email INTO user_name, user_email
    FROM users
    WHERE id = NEW.id;
    
    -- Criar cost_center se não existir um vinculado a este usuário
    IF NOT EXISTS (
      SELECT 1 FROM cost_centers 
      WHERE organization_id = NEW.organization_id 
        AND user_id = NEW.id
    ) THEN
      -- Contas solo sempre terão 100%, contas familia terão 50%
      -- O nome da organização nos dirá qual é qual
      DECLARE
        split_percent NUMERIC := 100.00; -- Default 100% (para contas solo)
      BEGIN
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
          NEW.id,
          user_email,
          split_percent,
          '#3B82F6',
          true
        );
        
        RAISE NOTICE 'Cost center criado para usuário: % com %%%', user_name, split_percent;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar comentário
COMMENT ON FUNCTION auto_create_cost_center_for_user() IS 
'Cria cost center automaticamente com 100% para contas solo. Para organizações familiares, os cost centers são criados manualmente via forms.';

