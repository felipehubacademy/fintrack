-- ============================================
-- CRIAR VIEW DE COMPATIBILIDADE: conversation_state
-- ============================================
-- Esta view cria um alias compatível para a tabela conversations
-- para que o código existente continue funcionando sem mudanças

-- Primeiro, vamos criar a estrutura simples que o código espera
CREATE TABLE IF NOT EXISTS conversation_state (
  user_phone TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  temp_data JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_phone ON conversation_state(user_phone);

-- Atualizar função de atualização de updated_at
CREATE OR REPLACE FUNCTION update_conversation_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS set_updated_at_conversation_state ON conversation_state;
CREATE TRIGGER set_updated_at_conversation_state
  BEFORE UPDATE ON conversation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_state_updated_at();

-- Comentários
COMMENT ON TABLE conversation_state IS 'Compatibilidade com código existente do Zul (usado por conversation_state ou conversations)';
COMMENT ON COLUMN conversation_state.user_phone IS 'Telefone do usuário (chave primária)';
COMMENT ON COLUMN conversation_state.state IS 'Estado da conversa: idle, awaiting_payment_method, awaiting_card, awaiting_responsible, awaiting_confirmation';
COMMENT ON COLUMN conversation_state.temp_data IS 'Dados temporários da conversa (thread_id, mensagens, etc)';

