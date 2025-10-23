-- ============================================
-- MIGRATION: Adicionar coluna 'role' em pending_invites
-- ============================================
-- Descrição: Permite definir o role (admin/member/viewer)
--            no momento do convite
-- ============================================

-- 1. Adicionar coluna 'role' com valor padrão 'member'
ALTER TABLE pending_invites 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'member';

-- 2. Adicionar constraint para validar valores
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pending_invites_role_check'
  ) THEN
    ALTER TABLE pending_invites 
    ADD CONSTRAINT pending_invites_role_check 
    CHECK (role IN ('admin', 'member', 'viewer'));
  END IF;
END $$;

-- 3. Criar índice para busca por role
CREATE INDEX IF NOT EXISTS idx_pending_invites_role 
ON pending_invites(role);

-- 4. Adicionar comentário
COMMENT ON COLUMN pending_invites.role IS 'Função que o usuário terá ao aceitar o convite: admin (acesso total), member (pode criar despesas), viewer (apenas visualiza)';

-- 5. Verificar resultado
SELECT 
  email,
  role,
  organization_id,
  invite_code,
  expires_at,
  created_at
FROM pending_invites
ORDER BY created_at DESC
LIMIT 10;

