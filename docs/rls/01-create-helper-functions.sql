-- ============================================================================
-- RLS Helper Functions
-- Funções auxiliares para simplificar as policies de RLS
-- ============================================================================

-- Função: Obter organization_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  user_email TEXT;
  user_org_id UUID;
BEGIN
  -- Obter email do JWT
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar organization_id do usuário na tabela users
  SELECT organization_id INTO user_org_id
  FROM users
  WHERE email = user_email AND is_active = true
  LIMIT 1;
  
  RETURN user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função: Verificar se usuário pertence à organização
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_org_id UUID;
BEGIN
  -- Se org_id for NULL, retornar false
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Obter email do JWT
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar organization_id do usuário
  SELECT organization_id INTO user_org_id
  FROM users
  WHERE email = user_email AND is_active = true
  LIMIT 1;
  
  -- Verificar se corresponde
  RETURN (user_org_id = org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função: Verificar role do usuário na organização
CREATE OR REPLACE FUNCTION user_has_role(check_role TEXT, org_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_record RECORD;
BEGIN
  -- Obter email do JWT
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Buscar dados do usuário
  SELECT organization_id, role INTO user_record
  FROM users
  WHERE email = user_email AND is_active = true
  LIMIT 1;
  
  -- Se não encontrou usuário
  IF user_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se org_id foi fornecido, verificar se corresponde
  IF org_id IS NOT NULL AND user_record.organization_id != org_id THEN
    RETURN false;
  END IF;
  
  -- Verificar role
  RETURN (user_record.role = check_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função: Obter user_id do usuário autenticado (da tabela users, não auth.users)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  user_email TEXT;
  user_id UUID;
BEGIN
  -- Tentar primeiro pelo auth.uid() (se disponível)
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO user_id
    FROM users
    WHERE id = auth.uid()
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  END IF;
  
  -- Fallback: buscar por email
  user_email := auth.jwt() ->> 'email';
  
  IF user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO user_id
  FROM users
  WHERE email = user_email AND is_active = true
  LIMIT 1;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função: Verificar se é admin da organização
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role('admin', org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comentários para documentação
COMMENT ON FUNCTION get_user_organization_id() IS 'Retorna o organization_id do usuário autenticado';
COMMENT ON FUNCTION user_belongs_to_org(UUID) IS 'Verifica se o usuário autenticado pertence à organização especificada';
COMMENT ON FUNCTION user_has_role(TEXT, UUID) IS 'Verifica se o usuário autenticado tem o role especificado na organização';
COMMENT ON FUNCTION get_current_user_id() IS 'Retorna o user_id da tabela users do usuário autenticado';
COMMENT ON FUNCTION is_org_admin(UUID) IS 'Verifica se o usuário autenticado é admin da organização';

