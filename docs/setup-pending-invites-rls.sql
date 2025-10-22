-- Configuração da tabela pending_invites (SEM RLS para testes)
-- Execute este script no Supabase SQL Editor

-- DESABILITAR RLS na tabela pending_invites para testes
ALTER TABLE pending_invites DISABLE ROW LEVEL SECURITY;

-- NOTA: RLS foi desabilitado para facilitar testes
-- Em produção, reative o RLS com as políticas de segurança

-- Função para limpar convites expirados
CREATE OR REPLACE FUNCTION cleanup_expired_pending_invites()
RETURNS void AS $$
BEGIN
  DELETE FROM pending_invites 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE pending_invites IS 'Convites pendentes para organizações';
COMMENT ON COLUMN pending_invites.id IS 'ID único do convite';
COMMENT ON COLUMN pending_invites.organization_id IS 'ID da organização';
COMMENT ON COLUMN pending_invites.email IS 'Email do usuário convidado';
COMMENT ON COLUMN pending_invites.phone IS 'Telefone do usuário convidado (opcional)';
COMMENT ON COLUMN pending_invites.invited_by IS 'ID do usuário que enviou o convite';
COMMENT ON COLUMN pending_invites.invite_code IS 'Código único do convite (8 caracteres)';
COMMENT ON COLUMN pending_invites.expires_at IS 'Data de expiração do convite';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS configurado para pending_invites com sucesso!';
  RAISE NOTICE 'Execute cleanup_expired_pending_invites() periodicamente para limpar convites expirados.';
END $$;
