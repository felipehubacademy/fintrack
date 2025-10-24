-- ============================================
-- ADICIONAR PAYMENT_METHOD À TABELA INCOMES
-- ============================================

-- Adicionar coluna payment_method à tabela incomes
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Adicionar constraint para validar os valores
ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_payment_method_check;
ALTER TABLE incomes ADD CONSTRAINT incomes_payment_method_check 
CHECK (payment_method IN ('cash', 'pix', 'deposit', 'bank_transfer', 'boleto', 'other'));

-- Comentário para documentação
COMMENT ON COLUMN incomes.payment_method IS 'Forma de recebimento: cash (Dinheiro), pix (PIX), deposit (Depósito), bank_transfer (Transferência Bancária), boleto (Boleto), other (Outros)';

-- Atualizar registros existentes para ter um valor padrão
UPDATE incomes SET payment_method = 'cash' WHERE payment_method IS NULL;

