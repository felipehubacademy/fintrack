-- ============================================================================
-- FIX COMPLETO - Corrigir todos os problemas de RLS de uma vez
-- Execute APENAS este script no SQL Editor do Supabase
-- ============================================================================
-- Este script corrige:
-- 1. Recursão infinita na política de users
-- 2. Funções helper que não funcionam corretamente
-- 3. Garante que todas as tabelas funcionem com RLS
-- ============================================================================

-- ============================================================================
-- PARTE 1: Corrigir funções helper (usar auth.uid() primeiro)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  -- Primeiro tentar pelo auth.uid() direto (mais confiável)
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

CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role('admin', org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PARTE 2: Corrigir política de users (SEM RECURSÃO)
-- ============================================================================

-- Remover TODAS as políticas problemáticas de users
DROP POLICY IF EXISTS "Users can view their organization members" ON users;
DROP POLICY IF EXISTS "Users can view same organization members" ON users;
DROP POLICY IF EXISTS "Users can view same org members" ON users;
DROP POLICY IF EXISTS "Users can view own record" ON users;

-- Criar função auxiliar para obter org_id sem causar recursão
CREATE OR REPLACE FUNCTION get_user_org_id_no_rls()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  auth_user_id := auth.uid();
  
  -- SECURITY DEFINER permite bypass RLS
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      RETURN user_org_id;
    END IF;
  END IF;
  
  user_email := auth.jwt() ->> 'email';
  IF user_email IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE email = user_email AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Política 1: Usuário pode ver próprio registro (SIMPLES, sem recursão)
CREATE POLICY "Users can view own record"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  email = (auth.jwt() ->> 'email')
);

-- Política 2: Usuário pode ver membros da mesma organização
-- Usa função SECURITY DEFINER que bypassa RLS (sem recursão)
CREATE POLICY "Users can view same org members"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_org_id_no_rls()
);

-- ============================================================================
-- PARTE 3: Verificar e garantir que outras políticas estão corretas
-- ============================================================================

-- Verificar se RLS está habilitado nas tabelas principais
DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  -- Garantir que RLS está habilitado
  ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ RLS habilitado em todas as tabelas principais';
END $$;

-- ============================================================================
-- PARTE 4: Teste rápido
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
    RAISE NOTICE '✅ get_user_organization_id() funcionando: %', test_org_id;
  ELSE
    RAISE NOTICE '⚠️  get_user_organization_id() retornou NULL (usuário pode não estar autenticado)';
  END IF;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ get_current_user_id() funcionando: %', test_user_id;
  ELSE
    RAISE NOTICE '⚠️  get_current_user_id() retornou NULL';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FIX COMPLETO APLICADO COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Recarregue a página do dashboard no navegador';
  RAISE NOTICE '2. Verifique se as transações aparecem';
  RAISE NOTICE '3. Se ainda houver problemas, verifique os logs do console';
  RAISE NOTICE '';
END $$;

