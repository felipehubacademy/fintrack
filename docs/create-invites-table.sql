-- Tabela de convites para organizações
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_invites_organization_id ON invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);

-- RLS (Row Level Security)
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Política: Usuários da organização podem ver convites
CREATE POLICY "Users can view invites from their organization"
ON invites FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- Política: Admins podem criar convites
CREATE POLICY "Admins can create invites"
ON invites FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid() AND
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Política: Admins podem atualizar convites
CREATE POLICY "Admins can update invites"
ON invites FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Função para limpar convites expirados
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
  UPDATE invites 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invites_updated_at
  BEFORE UPDATE ON invites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE invites IS 'Convites para participar de organizações';
COMMENT ON COLUMN invites.id IS 'Token único do convite (usado na URL)';
COMMENT ON COLUMN invites.organization_id IS 'ID da organização';
COMMENT ON COLUMN invites.email IS 'Email do usuário convidado';
COMMENT ON COLUMN invites.invited_by IS 'ID do usuário que enviou o convite';
COMMENT ON COLUMN invites.status IS 'Status do convite: pending, accepted, expired, cancelled';
COMMENT ON COLUMN invites.expires_at IS 'Data de expiração do convite';
COMMENT ON COLUMN invites.accepted_at IS 'Data de aceitação do convite';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela de convites criada com sucesso!';
  RAISE NOTICE 'Execute cleanup_expired_invites() periodicamente para limpar convites expirados.';
END $$;
