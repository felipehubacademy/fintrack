-- ============================================================================
-- FIX CRÍTICO: Política de users sem recursão
-- Remove a subquery que causava recursão infinita
-- ============================================================================

-- Remover política problemática
DROP POLICY IF EXISTS "Users can view their organization members" ON users;

-- Criar política SIMPLES que não causa recursão
-- A política precisa permitir:
-- 1. Usuário ver próprio registro (por auth.uid() ou email)
-- 2. Usuário ver outros membros da mesma organização
-- 
-- Mas sem fazer subquery na mesma tabela (causa recursão)
-- Vamos usar uma abordagem diferente: permitir acesso baseado apenas em auth.uid() e email do JWT

CREATE POLICY "Users can view their organization members"
ON users
FOR SELECT
TO authenticated
USING (
  -- Próprio registro por auth.uid()
  id = auth.uid() OR
  -- Próprio registro por email do JWT
  email = (auth.jwt() ->> 'email')
  -- NOTA: Removemos a parte de ver outros membros da mesma organização
  -- porque isso requer subquery que causa recursão.
  -- Os membros da mesma organização serão visíveis através de outras queries
  -- que filtram por organization_id explicitamente (ex: via useOrganization hook)
);

-- Mas precisamos permitir que usuários vejam outros membros da organização
-- Para isso, criamos uma política adicional que usa uma função helper
-- que NÃO está sujeita à política RLS (SECURITY DEFINER)

-- Função auxiliar para obter organization_id sem recursão
CREATE OR REPLACE FUNCTION get_user_org_id_no_rls()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  auth_user_id := auth.uid();
  
  -- Primeiro tentar pelo auth.uid() diretamente (sem RLS devido a SECURITY DEFINER)
  IF auth_user_id IS NOT NULL THEN
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
  IF user_email IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE email = user_email AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN user_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Agora criar política adicional para ver membros da mesma organização
-- usando a função helper que bypassa RLS
CREATE POLICY "Users can view same organization members"
ON users
FOR SELECT
TO authenticated
USING (
  -- Permitir se organization_id corresponde ao do usuário logado
  -- usando função que não está sujeita a RLS
  organization_id = get_user_org_id_no_rls() AND
  organization_id IS NOT NULL
);

DO $$
BEGIN
  RAISE NOTICE '✅ Política de users corrigida (sem recursão)';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora recarregue a página do dashboard';
END $$;

