-- ============================================================================
-- FIX CRÍTICO: Remover recursão infinita na política de users
-- ============================================================================
-- PROBLEMA: A política de SELECT em users faz subquery na própria tabela,
-- causando recursão infinita ("infinite recursion detected in policy")
-- 
-- SOLUÇÃO: Usar apenas auth.uid() e email do JWT diretamente, sem subqueries
-- ============================================================================

-- Remover TODAS as políticas de users que podem causar recursão
DROP POLICY IF EXISTS "Users can view their organization members" ON users;
DROP POLICY IF EXISTS "Users can view same organization members" ON users;

-- Criar política SIMPLES que NÃO faz subquery na mesma tabela
-- Esta política permite apenas que usuário veja seu próprio registro
CREATE POLICY "Users can view own record"
ON users
FOR SELECT
TO authenticated
USING (
  -- Próprio registro por auth.uid()
  id = auth.uid() OR
  -- Próprio registro por email do JWT
  email = (auth.jwt() ->> 'email')
);

-- Para permitir ver outros membros da organização, criamos uma política separada
-- que usa uma função SECURITY DEFINER que bypassa RLS
-- Esta função já existe (get_user_organization_id), mas vamos criar uma versão
-- que garante não causar recursão

-- Verificar se a função existe, se não, criar
CREATE OR REPLACE FUNCTION get_user_org_id_simple()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  -- Tentar pelo auth.uid() primeiro
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    -- SECURITY DEFINER permite bypass RLS
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      RETURN user_org_id;
    END IF;
  END IF;
  
  -- Fallback: email do JWT
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

-- Política adicional para ver membros da mesma organização
-- Usando função SECURITY DEFINER que não está sujeita a RLS
CREATE POLICY "Users can view same org members"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL AND
  organization_id = get_user_org_id_simple()
);

-- Atualizar as funções helper existentes para usar a mesma abordagem
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN get_user_org_id_simple();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DO $$
BEGIN
  RAISE NOTICE '✅ Política de users corrigida (sem recursão)';
  RAISE NOTICE '';
  RAISE NOTICE 'Teste recarregando a página';
END $$;

