-- FinTrack Database Schema UPDATE
-- Adiciona campos para rastreamento de transações do WhatsApp

-- 1. Adicionar campo para armazenar ID da transação Pluggy
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS pluggy_transaction_id TEXT UNIQUE;

-- 2. Adicionar campo para categoria da transação
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS category TEXT;

-- 3. Adicionar campo para status da transação
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 4. Adicionar campo para WhatsApp message ID
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- 5. Adicionar campo para timestamp de confirmação
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_expenses_pluggy_id ON expenses(pluggy_transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- Adicionar comentários
COMMENT ON COLUMN expenses.pluggy_transaction_id IS 'ID da transação original do Pluggy';
COMMENT ON COLUMN expenses.category IS 'Categoria da transação (Beleza, Combustível, etc)';
COMMENT ON COLUMN expenses.status IS 'Status: pending, confirmed, ignored';
COMMENT ON COLUMN expenses.whatsapp_message_id IS 'ID da mensagem WhatsApp enviada';
COMMENT ON COLUMN expenses.confirmed_at IS 'Timestamp de quando o usuário confirmou';

-- Criar view para totais individuais
CREATE OR REPLACE VIEW individual_totals AS
SELECT 
  owner,
  DATE_TRUNC('month', date) as month,
  SUM(CASE 
    WHEN owner = 'Compartilhado' THEN amount / 2 
    ELSE amount 
  END) as individual_amount,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM expenses
WHERE status = 'confirmed' AND owner IS NOT NULL
GROUP BY owner, DATE_TRUNC('month', date)
ORDER BY month DESC, owner;

-- Grant acesso à view
GRANT SELECT ON individual_totals TO authenticated;

-- Criar função para calcular total individual
CREATE OR REPLACE FUNCTION get_individual_total(
  p_owner TEXT,
  p_month DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT 
    SUM(CASE 
      WHEN owner = 'Compartilhado' THEN amount / 2 
      WHEN owner = p_owner THEN amount 
      ELSE 0 
    END)
  INTO v_total
  FROM expenses
  WHERE status = 'confirmed'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', p_month);
  
  RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ FinTrack schema atualizado com sucesso!';
  RAISE NOTICE 'Novos campos: pluggy_transaction_id, category, status, whatsapp_message_id, confirmed_at';
  RAISE NOTICE 'Nova view: individual_totals';
  RAISE NOTICE 'Nova função: get_individual_total(owner, month)';
END $$;

