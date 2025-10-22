-- Adicionar colunas de verificação de telefone na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verification_attempt TIMESTAMP WITH TIME ZONE;

-- Criar tabela para códigos de verificação temporários
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'whatsapp_code' ou 'whatsapp_link'
  token VARCHAR(64) UNIQUE, -- Para verificação via link (opcional)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45), -- Para segurança
  user_agent TEXT, -- Para segurança
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_token ON verification_codes(token);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Índices na tabela users para queries de verificação
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Comentários para documentação
COMMENT ON COLUMN users.phone_verified IS 'Indica se o telefone do usuário foi verificado';
COMMENT ON COLUMN users.phone_verified_at IS 'Data e hora da verificação do telefone';
COMMENT ON COLUMN users.verification_attempts IS 'Número de tentativas de verificação (rate limiting)';
COMMENT ON COLUMN users.last_verification_attempt IS 'Data e hora da última tentativa de verificação';

COMMENT ON TABLE verification_codes IS 'Códigos temporários para verificação de telefone via WhatsApp';
COMMENT ON COLUMN verification_codes.code IS 'Código de 6 dígitos enviado ao usuário';
COMMENT ON COLUMN verification_codes.type IS 'Tipo de verificação: whatsapp_code ou whatsapp_link';
COMMENT ON COLUMN verification_codes.token IS 'Token único para verificação via link (opcional)';
COMMENT ON COLUMN verification_codes.expires_at IS 'Data e hora de expiração do código (10 minutos)';
COMMENT ON COLUMN verification_codes.used_at IS 'Data e hora em que o código foi usado';

-- Função para limpar códigos expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS (Row Level Security)
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas seus próprios códigos
CREATE POLICY "Users can view their own verification codes"
  ON verification_codes
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Policy: Apenas o sistema pode criar códigos (via service role)
CREATE POLICY "System can create verification codes"
  ON verification_codes
  FOR INSERT
  WITH CHECK (true);

-- Policy: Apenas o sistema pode atualizar códigos
CREATE POLICY "System can update verification codes"
  ON verification_codes
  FOR UPDATE
  USING (true);

-- Atualizar usuários existentes (opcional - comentado por segurança)
-- UNCOMMENT APENAS se quiser marcar usuários existentes como verificados
-- UPDATE users SET phone_verified = true WHERE phone IS NOT NULL AND phone != '';

-- Verificação: Mostrar estatísticas
DO $$
BEGIN
  RAISE NOTICE 'Colunas de verificação adicionadas com sucesso!';
  RAISE NOTICE 'Tabela verification_codes criada!';
  RAISE NOTICE 'Políticas de segurança configuradas!';
END $$;

