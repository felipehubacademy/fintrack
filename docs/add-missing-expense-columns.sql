-- ============================================
-- ADICIONAR COLUNAS FALTANTES NA TABELA EXPENSES
-- ============================================

-- 1. Coluna 'owner' (texto) - nome do responsável
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS owner TEXT;

-- 2. Coluna 'source' - origem da despesa (whatsapp, manual, import)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('whatsapp', 'manual', 'import'));

-- 3. Coluna 'confirmed_at' - data de confirmação
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Coluna 'confirmed_by' - usuário que confirmou
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);

-- 5. Coluna 'whatsapp_message_id' - ID da mensagem do WhatsApp
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- 6. Coluna 'conversation_state' - estado da conversa
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS conversation_state JSONB;

-- 7. Coluna 'installment_info' - informações de parcelamento
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_info JSONB;

-- 8. Coluna 'parent_expense_id' - ID da primeira parcela (para agrupar parcelas)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parent_expense_id BIGINT REFERENCES expenses(id);

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'expenses' 
AND column_name IN ('owner', 'source', 'confirmed_at', 'confirmed_by', 'whatsapp_message_id', 'conversation_state', 'installment_info', 'parent_expense_id')
ORDER BY column_name;
