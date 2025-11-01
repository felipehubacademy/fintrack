-- ============================================================================
-- QUICK FIX - Corrigir problema de RLS bloqueando acesso
-- Execute este script no SQL Editor do Supabase para corrigir o problema
-- ============================================================================

-- PASSO 1: Corrigir funções helper (usar auth.uid() primeiro)
-- ============================================================================

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
    
    -- Se não encontrou, retornar o auth.uid() mesmo
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

-- PASSO 2: Corrigir política de SELECT na tabela users
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organization members" ON users;
CREATE POLICY "Users can view their organization members"
ON users
FOR SELECT
TO authenticated
USING (
  -- Próprio registro (por ID do auth OU email)
  id = auth.uid() OR
  email = (auth.jwt() ->> 'email') OR
  -- Outros membros da mesma organização
  (
    organization_id IS NOT NULL AND
    organization_id = (
      SELECT organization_id FROM users 
      WHERE (id = auth.uid() OR email = (auth.jwt() ->> 'email')) 
      AND is_active = true
      LIMIT 1
    )
  )
);

-- PASSO 3: Verificar se funções estão funcionando
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  test_user_id UUID;
BEGIN
  -- Testar se funções retornam algo (se usuário estiver autenticado)
  test_org_id := get_user_organization_id();
  test_user_id := get_current_user_id();
  
  IF test_org_id IS NOT NULL THEN
    RAISE NOTICE '✅ Função get_user_organization_id() funcionando: %', test_org_id;
  ELSE
    RAISE WARNING '⚠️  get_user_organization_id() retornou NULL - usuário pode não estar autenticado ou sem organization_id';
  END IF;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Função get_current_user_id() funcionando: %', test_user_id;
  ELSE
    RAISE WARNING '⚠️  get_current_user_id() retornou NULL';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Quick Fix aplicado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Recarregue o dashboard no navegador';
  RAISE NOTICE '2. Verifique se as transações aparecem';
  RAISE NOTICE '3. Se ainda não funcionar, veja docs/rls/TROUBLESHOOTING.md';
END $$;

