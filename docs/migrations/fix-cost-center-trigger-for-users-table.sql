-- ============================================================================
-- CORREÇÃO: Criar trigger de cost_center para tabela USERS
-- ============================================================================
-- PROBLEMA: Trigger antigo foi criado para 'organization_members' que não existe
-- SOLUÇÃO: Criar trigger na tabela 'users' para quando organization_id for definido

-- 1. REMOVER triggers antigos (se existirem)
DROP TRIGGER IF EXISTS trigger_auto_link_cost_center ON organization_members;
DROP TRIGGER IF EXISTS trigger_auto_create_cost_center ON organization_members;
DROP TRIGGER IF EXISTS trigger_auto_link_cost_center ON users;
DROP TRIGGER IF EXISTS trigger_auto_create_cost_center ON users;

-- 2. RECRIAR função para criar cost_center automaticamente
CREATE OR REPLACE FUNCTION auto_create_cost_center_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas criar cost_center quando:
  -- 1. organization_id for definido (não nulo)
  -- 2. Role for 'admin' ou 'member' (não 'viewer')
  IF NEW.organization_id IS NOT NULL 
     AND NEW.role IN ('admin', 'member')
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    -- Criar cost_center se não existir um vinculado a este usuário
    IF NOT EXISTS (
      SELECT 1 FROM cost_centers 
      WHERE organization_id = NEW.organization_id 
        AND user_id = NEW.id
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
        COALESCE(NEW.name, 'Novo Membro'),
        NEW.id,
        NEW.email,
        50.00, -- Percentual padrão
        '#3B82F6', -- Azul padrão
        true
      );
      
      RAISE NOTICE 'Cost center criado para usuário: % (ID: %)', NEW.name, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CRIAR trigger na tabela USERS
-- Executa após INSERT ou UPDATE (quando organization_id é definido)
CREATE TRIGGER trigger_auto_create_cost_center
  AFTER INSERT OR UPDATE OF organization_id, role ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_cost_center_for_user();

-- 4. RECRIAR função para vincular cost_centers pendentes
CREATE OR REPLACE FUNCTION auto_link_cost_center_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando organization_id é definido, tentar vincular cost_centers pendentes
  IF NEW.organization_id IS NOT NULL 
     AND (OLD.organization_id IS NULL OR OLD.organization_id IS DISTINCT FROM NEW.organization_id) THEN
    
    -- Vincular cost_centers que estavam aguardando este email
    UPDATE cost_centers
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE organization_id = NEW.organization_id
      AND linked_email = NEW.email
      AND user_id IS NULL;
    
    RAISE NOTICE 'Cost centers vinculados para: % (email: %)', NEW.name, NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRIAR trigger para vincular cost_centers pendentes
CREATE TRIGGER trigger_auto_link_cost_center
  AFTER INSERT OR UPDATE OF organization_id ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_cost_center_to_user();

-- 6. Adicionar comentários
COMMENT ON FUNCTION auto_create_cost_center_for_user() IS 
  'Cria automaticamente cost_center quando user.organization_id é definido (role: admin/member)';
COMMENT ON FUNCTION auto_link_cost_center_to_user() IS 
  'Vincula cost_centers pendentes quando user.organization_id é definido';
COMMENT ON TRIGGER trigger_auto_create_cost_center ON users IS 
  'Trigger para criar cost_center automaticamente na tabela users';
COMMENT ON TRIGGER trigger_auto_link_cost_center ON users IS 
  'Trigger para vincular cost_centers pendentes na tabela users';

-- 7. Verificar se triggers foram criados
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'users'
  AND trigger_name LIKE '%cost_center%'
ORDER BY trigger_name;

