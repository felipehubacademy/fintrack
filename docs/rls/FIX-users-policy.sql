-- ============================================================================
-- FIX: Política da tabela users - Garantir que funções helper funcionem
-- A política atual pode estar bloqueando acesso necessário
-- ============================================================================

-- Verificar e corrigir política SELECT de users
-- A política precisa permitir que usuários vejam seu próprio registro
-- E também permitir que funções SECURITY DEFINER vejam quando necessário

DROP POLICY IF EXISTS "Users can view their organization members" ON users;
CREATE POLICY "Users can view their organization members"
ON users
FOR SELECT
TO authenticated
USING (
  -- Próprio registro (por ID do auth OU email)
  id = auth.uid() OR
  email = (auth.jwt() ->> 'email') OR
  -- Outros membros da mesma organização (mas apenas se conseguir buscar org_id)
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

