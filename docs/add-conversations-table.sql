-- ============================================
-- ADICIONAR TABELA CONVERSATIONS
-- ============================================

-- Tabela para armazenar conversas pendentes do WhatsApp
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_card_info', 'completed', 'cancelled')),
    conversation_state JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);

-- Comentários
COMMENT ON TABLE conversations IS 'Tabela para armazenar conversas pendentes do WhatsApp';
COMMENT ON COLUMN conversations.status IS 'Status da conversa: pending, waiting_card_info, completed, cancelled';
COMMENT ON COLUMN conversations.conversation_state IS 'Estado da conversa em JSON para continuar de onde parou';
