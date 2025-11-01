-- ============================================================================
-- RLS Policies: Users
-- Controla acesso à tabela users
-- ============================================================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Ver próprio registro OU outros da mesma organização
DROP POLICY IF EXISTS "Users can view their organization members" ON users;
CREATE POLICY "Users can view their organization members"
ON users
FOR SELECT
TO authenticated
USING (
  -- Próprio registro OU
  id = get_current_user_id() OR
  -- Outros membros da mesma organização
  (
    organization_id = get_user_organization_id() AND
    get_user_organization_id() IS NOT NULL
  )
);

-- Policy: INSERT - Permitir self-service signup (criar próprio registro)
-- Backend também pode criar via service role
DROP POLICY IF EXISTS "Users can insert their own record or org members" ON users;
CREATE POLICY "Users can insert their own record or org members"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Self-service: permitir criar registro próprio
  -- O email no JWT deve corresponder ao email sendo inserido
  email = (auth.jwt() ->> 'email') OR
  -- Ou admin criando membro na própria organização
  (
    organization_id = get_user_organization_id() AND
    is_org_admin(organization_id)
  )
);

-- Policy: UPDATE - Próprio registro OU admin da organização
DROP POLICY IF EXISTS "Users can update their own record or admins can update members" ON users;
CREATE POLICY "Users can update their own record or admins can update members"
ON users
FOR UPDATE
TO authenticated
USING (
  -- Próprio registro OU
  id = get_current_user_id() OR
  -- Admin atualizando membro da própria organização
  (
    organization_id = get_user_organization_id() AND
    is_org_admin(organization_id)
  )
)
WITH CHECK (
  -- Mesmas condições para o novo estado
  id = get_current_user_id() OR
  (
    organization_id = get_user_organization_id() AND
    is_org_admin(organization_id)
  )
);

-- Policy: DELETE - Bloqueado via RLS (apenas service role)
DROP POLICY IF EXISTS "Service role can delete users" ON users;
CREATE POLICY "Service role can delete users"
ON users
FOR DELETE
TO authenticated
USING (false); -- Bloquear DELETE direto - usar service role (soft delete via is_active)

COMMENT ON POLICY "Users can view their organization members" ON users IS 
'Permite que usuários vejam membros da própria organização ou seu próprio registro';

COMMENT ON POLICY "Users can insert their own record or org members" ON users IS 
'Permite self-service signup ou admin criando membros';

COMMENT ON POLICY "Users can update their own record or admins can update members" ON users IS 
'Permite usuário atualizar próprio registro ou admin atualizar membros';

