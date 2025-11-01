-- ============================================================================
-- FIX: Helper Functions - Versão corrigida
-- Corrige problemas de acesso às funções helper que podem estar bloqueando queries
-- ============================================================================

-- Função: Obter organization_id do usuário autenticado (CORRIGIDA)
-- Usa auth.uid() diretamente quando possível para evitar dependência de RLS
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  -- Primeiro tentar pelo auth.uid() direto
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    -- Tentar buscar pelo ID direto (mais rápido)
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      RETURN user_org_id;
    END IF;
  END IF;
  
  -- Fallback: usar email do JWT
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

-- Função: Verificar se usuário pertence à organização (CORRIGIDA)
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  -- Se org_id for NULL, retornar false
  IF org_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Primeiro tentar pelo auth.uid()
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      RETURN (user_org_id = org_id);
    END IF;
  END IF;
  
  -- Fallback: usar email
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

-- Função: Obter user_id do usuário autenticado (CORRIGIDA)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_id UUID;
  user_email TEXT;
BEGIN
  -- Primeiro tentar pelo auth.uid() direto
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    -- Verificar se existe na tabela users
    SELECT id INTO user_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
    
    -- Se não encontrou, retornar o auth.uid() mesmo (caso o user ainda não esteja na tabela)
    -- Mas isso não deveria acontecer em produção
    RETURN auth_user_id;
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

-- Função: Verificar role do usuário na organização (CORRIGIDA)
CREATE OR REPLACE FUNCTION user_has_role(check_role TEXT, org_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  auth_user_id UUID;
  user_record RECORD;
  user_email TEXT;
BEGIN
  -- Primeiro tentar pelo auth.uid()
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id, role INTO user_record
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_record IS NOT NULL THEN
      -- Se org_id foi fornecido, verificar se corresponde
      IF org_id IS NOT NULL AND user_record.organization_id != org_id THEN
        RETURN false;
      END IF;
      
      -- Verificar role
      RETURN (user_record.role = check_role);
    END IF;
  END IF;
  
  -- Fallback: usar email
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

-- Função: Verificar se é admin da organização (mantida igual)
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role('admin', org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

