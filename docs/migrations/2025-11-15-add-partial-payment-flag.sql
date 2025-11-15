-- Adiciona coluna is_partial_payment para identificar pagamentos parciais de fatura
-- Pagamentos parciais são valores negativos que reduzem a fatura pendente antes do fechamento

-- Adicionar coluna is_partial_payment
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_partial_payment BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_expenses_partial_payment ON expenses(is_partial_payment) WHERE is_partial_payment = true;

-- Comentário na coluna
COMMENT ON COLUMN expenses.is_partial_payment IS 'Indica se é um pagamento parcial de fatura (valor negativo que reduz fatura pendente)';

