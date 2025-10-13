-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🏗️ FINTRACK V2 - SCHEMA COMPLETO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. TABELA: expenses_general (Despesas Gerais)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE expenses_general (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  owner TEXT CHECK (owner IN ('Felipe', 'Leticia', 'Compartilhado')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  split BOOLEAN DEFAULT false,
  payment_method TEXT CHECK (payment_method IN ('cash', 'debit', 'pix', 'credit_card', 'other')),
  whatsapp_message_id TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_expenses_general_date ON expenses_general(date DESC);
CREATE INDEX idx_expenses_general_owner ON expenses_general(owner);
CREATE INDEX idx_expenses_general_status ON expenses_general(status);
CREATE INDEX idx_expenses_general_payment_method ON expenses_general(payment_method);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expenses_general_updated_at BEFORE UPDATE
    ON expenses_general FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. TABELA: conversation_state (Estado da Conversa WhatsApp)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE conversation_state (
  id BIGSERIAL PRIMARY KEY,
  user_phone TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'idle',
    'awaiting_payment_method',
    'awaiting_owner',
    'awaiting_confirmation'
  )),
  temp_data JSONB DEFAULT '{}',
  last_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
  
  -- Um usuário só pode ter um estado ativo por vez
  UNIQUE(user_phone)
);

-- Índice para limpeza de estados expirados
CREATE INDEX idx_conversation_state_expires ON conversation_state(expires_at);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_conversation_state_updated_at BEFORE UPDATE
    ON conversation_state FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar estados expirados (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_conversations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM conversation_state
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. VIEW: all_expenses (Despesas Consolidadas)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE VIEW all_expenses AS
  -- Despesas de cartão de crédito (Pluggy)
  SELECT 
    id,
    date,
    description,
    amount,
    category,
    owner,
    status,
    split,
    'credit_card' as payment_method,
    'card' as source_type,
    'pluggy' as source,
    created_at
  FROM expenses
  WHERE status != 'ignored'
  
  UNION ALL
  
  -- Despesas gerais (WhatsApp)
  SELECT 
    id,
    date,
    description,
    amount,
    category,
    owner,
    status,
    split,
    payment_method,
    'general' as source_type,
    'whatsapp' as source,
    created_at
  FROM expenses_general
  WHERE status != 'cancelled'
  
  ORDER BY date DESC, created_at DESC;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. FUNÇÃO: get_monthly_summary (Resumo Mensal Consolidado)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION get_monthly_summary(
  target_month DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  month TEXT,
  card_felipe DECIMAL,
  card_leticia DECIMAL,
  card_shared DECIMAL,
  card_total DECIMAL,
  general_felipe DECIMAL,
  general_leticia DECIMAL,
  general_shared DECIMAL,
  general_total DECIMAL,
  grand_total DECIMAL,
  felipe_individual DECIMAL,
  leticia_individual DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT 
      DATE_TRUNC('month', target_month)::DATE as start_date,
      (DATE_TRUNC('month', target_month) + INTERVAL '1 month - 1 day')::DATE as end_date
  ),
  card_summary AS (
    SELECT
      COALESCE(SUM(CASE WHEN owner = 'Felipe' THEN amount ELSE 0 END), 0) as felipe,
      COALESCE(SUM(CASE WHEN owner = 'Leticia' THEN amount ELSE 0 END), 0) as leticia,
      COALESCE(SUM(CASE WHEN owner = 'Compartilhado' THEN amount ELSE 0 END), 0) as shared
    FROM expenses, date_range
    WHERE status = 'confirmed'
      AND date >= date_range.start_date
      AND date <= date_range.end_date
  ),
  general_summary AS (
    SELECT
      COALESCE(SUM(CASE WHEN owner = 'Felipe' THEN amount ELSE 0 END), 0) as felipe,
      COALESCE(SUM(CASE WHEN owner = 'Leticia' THEN amount ELSE 0 END), 0) as leticia,
      COALESCE(SUM(CASE WHEN owner = 'Compartilhado' THEN amount ELSE 0 END), 0) as shared
    FROM expenses_general, date_range
    WHERE status = 'confirmed'
      AND date >= date_range.start_date
      AND date <= date_range.end_date
  )
  SELECT
    TO_CHAR(target_month, 'YYYY-MM'),
    c.felipe::DECIMAL,
    c.leticia::DECIMAL,
    c.shared::DECIMAL,
    (c.felipe + c.leticia + c.shared)::DECIMAL,
    g.felipe::DECIMAL,
    g.leticia::DECIMAL,
    g.shared::DECIMAL,
    (g.felipe + g.leticia + g.shared)::DECIMAL,
    (c.felipe + c.leticia + c.shared + g.felipe + g.leticia + g.shared)::DECIMAL,
    (c.felipe + g.felipe + (c.shared + g.shared) / 2)::DECIMAL,
    (c.leticia + g.leticia + (c.shared + g.shared) / 2)::DECIMAL
  FROM card_summary c, general_summary g;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. FUNÇÃO: get_expenses_by_category (Despesas por Categoria)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION get_expenses_by_category(
  target_month DATE DEFAULT CURRENT_DATE,
  expense_type TEXT DEFAULT 'all' -- 'all', 'card', 'general'
)
RETURNS TABLE(
  category TEXT,
  total DECIMAL,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT 
      DATE_TRUNC('month', target_month)::DATE as start_date,
      (DATE_TRUNC('month', target_month) + INTERVAL '1 month - 1 day')::DATE as end_date
  )
  SELECT
    COALESCE(category, 'Outros') as category,
    SUM(amount)::DECIMAL as total,
    COUNT(*)::BIGINT as count
  FROM all_expenses, date_range
  WHERE status = 'confirmed'
    AND date >= date_range.start_date
    AND date <= date_range.end_date
    AND (expense_type = 'all' OR source_type = expense_type)
  GROUP BY category
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. RLS (Row Level Security)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Habilitar RLS
ALTER TABLE expenses_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Políticas para expenses_general
CREATE POLICY "Allow authenticated users to read expenses_general"
  ON expenses_general FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN (SELECT email FROM allowed_users)));

CREATE POLICY "Allow authenticated users to insert expenses_general"
  ON expenses_general FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email IN (SELECT email FROM allowed_users)));

CREATE POLICY "Allow authenticated users to update expenses_general"
  ON expenses_general FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN (SELECT email FROM allowed_users)));

CREATE POLICY "Allow authenticated users to delete expenses_general"
  ON expenses_general FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN (SELECT email FROM allowed_users)));

-- Políticas para conversation_state (apenas para sistema/backend)
CREATE POLICY "Allow service role to manage conversation_state"
  ON conversation_state FOR ALL TO service_role
  USING (true);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. DADOS DE EXEMPLO (Opcional para teste)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Comentar/descomentar conforme necessário
/*
INSERT INTO expenses_general (date, description, amount, category, owner, status, payment_method) VALUES
  (CURRENT_DATE, 'Posto Shell', 250.00, 'Combustível', 'Felipe', 'confirmed', 'debit'),
  (CURRENT_DATE - 1, 'Supermercado Pão de Açúcar', 180.50, 'Supermercado', 'Compartilhado', 'confirmed', 'pix'),
  (CURRENT_DATE - 2, 'Uber', 35.00, 'Transporte', 'Leticia', 'confirmed', 'credit_card');
*/

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. VERIFICAÇÃO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE '✅ Schema V2 criado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tabelas criadas:';
  RAISE NOTICE '   - expenses_general';
  RAISE NOTICE '   - conversation_state';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Views criadas:';
  RAISE NOTICE '   - all_expenses';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Funções criadas:';
  RAISE NOTICE '   - get_monthly_summary()';
  RAISE NOTICE '   - get_expenses_by_category()';
  RAISE NOTICE '   - cleanup_expired_conversations()';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS habilitado e políticas aplicadas';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximo passo: Executar no Supabase SQL Editor';
END $$;

