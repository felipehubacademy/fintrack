-- ============================================
-- ADICIONAR BOLETO E BANK_TRANSFER AO PROJETO
-- ============================================

-- 1. Atualizar constraint da tabela bills para incluir boleto e bank_transfer
-- ============================================

-- Primeiro, remover a constraint antiga
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;

-- Adicionar nova constraint com os valores expandidos
ALTER TABLE bills ADD CONSTRAINT bills_payment_method_check 
CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'other', 'boleto', 'bank_transfer'));

-- 2. Atualizar constraint da tabela expenses para consistência
-- ============================================

-- Remover constraint antiga se existir
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- Adicionar nova constraint com os valores expandidos
ALTER TABLE expenses ADD CONSTRAINT expenses_payment_method_check 
CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'));

-- 3. Comentários para documentação
-- ============================================
COMMENT ON CONSTRAINT bills_payment_method_check ON bills IS 'Métodos de pagamento válidos para contas a pagar';
COMMENT ON CONSTRAINT expenses_payment_method_check ON expenses IS 'Métodos de pagamento válidos para despesas';
