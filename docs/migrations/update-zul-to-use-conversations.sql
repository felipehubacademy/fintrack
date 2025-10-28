-- ============================================
-- OPÇÃO ALTERNATIVA: USAR TABELA conversations
-- E ATUALIZAR O CÓDIGO PARA USÁ-LA
-- ============================================
-- Se preferir usar a tabela conversations existente
-- ao invés de criar conversation_state, este script
-- mostra como adaptar os queries

-- NOTA: Esta é a abordagem mais "correta" mas requer
-- mudanças no código JavaScript

-- Exemplos de queries adaptados:

-- ============================================
-- EXEMPLO 1: loadThreadFromDB()
-- ============================================
-- ANTES:
--   .from('conversation_state')
--   .eq('user_phone', phone)
--   .select('temp_data')

-- DEPOIS:
--   .from('conversations')
--   .eq('phone', phone)
--   .order('updated_at', { ascending: false })
--   .limit(1)
--   .select('conversation_state')

-- ============================================
-- EXEMPLO 2: saveThreadToDB()
-- ============================================
-- ANTES:
--   .from('conversation_state')
--   .upsert({
--     user_phone: phone,
--     state: state,
--     temp_data: data
--   }, { onConflict: 'user_phone' })

-- DEPOIS:
--   .from('conversations')
--   .upsert({
--     user_id: userId,
--     organization_id: orgId,
--     phone: phone,
--     status: state,
--     conversation_state: data
--   }, { onConflict: 'phone' })

-- ============================================
-- CONSTRAINT UNIQUE NECESSÁRIA
-- ============================================
-- Adicionar constraint unique para permitir upsert por phone
ALTER TABLE conversations 
ADD CONSTRAINT conversations_phone_unique 
UNIQUE (phone);

-- OU, se quiser permitir múltiplas organizações com mesmo phone:
-- ALTER TABLE conversations 
-- ADD CONSTRAINT conversations_phone_org_unique 
-- UNIQUE (phone, organization_id);

-- ============================================
-- MAPEAMENTO DE CAMPOS
-- ============================================
-- conversation_state → conversations
-- 
-- Campos antigos    → Novos
-- user_phone       → phone
-- state            → status
-- temp_data        → conversation_state
-- updated_at       → updated_at (igual)
--
-- Adicionar:
-- id (UUID, PK)
-- user_id (FK)
-- organization_id (FK)
-- created_at

-- ============================================
-- FUNÇÕES AUXILIARES SUGERIDAS
-- ============================================

-- Função para buscar conversa ativa por telefone
CREATE OR REPLACE FUNCTION get_active_conversation(p_phone TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  organization_id UUID,
  phone TEXT,
  status TEXT,
  conversation_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.organization_id,
    c.phone,
    c.status,
    c.conversation_state,
    c.created_at,
    c.updated_at
  FROM conversations c
  WHERE c.phone = p_phone
    AND c.status != 'completed'
  ORDER BY c.updated_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar conversas antigas (>30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE conversations 
  SET status = 'cancelled',
      conversation_state = '{}'
  WHERE status != 'cancelled'
    AND status != 'completed'
    AND updated_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Criar um job agendado (usando pg_cron se disponível)
-- SELECT cron.schedule('cleanup-old-conversations', '0 3 * * *', 'SELECT cleanup_old_conversations();');

