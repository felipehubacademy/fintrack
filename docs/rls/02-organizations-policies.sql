-- ============================================================================
-- RLS Policies: Organizations
-- Controla acesso à tabela organizations
-- ============================================================================

-- Habilitar RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Membros podem ver própria organização
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
ON organizations
FOR SELECT
TO authenticated
USING (
  id = get_user_organization_id()
);

-- Policy: INSERT - Apenas via service role (self-service durante signup é tratado pelo backend)
-- Não permitimos INSERT direto via RLS - apenas via service role/admin
-- Esta policy permite INSERT apenas se não houver conflito com outras validações
DROP POLICY IF EXISTS "Service role can insert organizations" ON organizations;
CREATE POLICY "Service role can insert organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (false); -- Bloquear INSERT direto - usar service role

-- Policy: UPDATE - Apenas admin da organização
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
CREATE POLICY "Admins can update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id = get_user_organization_id() AND is_org_admin(id)
)
WITH CHECK (
  id = get_user_organization_id() AND is_org_admin(id)
);

-- Policy: DELETE - Bloqueado via RLS (apenas service role)
DROP POLICY IF EXISTS "Service role can delete organizations" ON organizations;
CREATE POLICY "Service role can delete organizations"
ON organizations
FOR DELETE
TO authenticated
USING (false); -- Bloquear DELETE direto - usar service role

COMMENT ON POLICY "Users can view their own organization" ON organizations IS 
'Permite que usuários vejam apenas sua própria organização';

