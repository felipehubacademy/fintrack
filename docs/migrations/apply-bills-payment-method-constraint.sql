-- ============================================
-- ATUALIZAR CONSTRAINT DE PAYMENT_METHOD PARA BILLS
-- ============================================
-- Execute este script no Supabase SQL Editor para atualizar a constraint
-- e permitir os métodos de pagamento: boleto e bank_transfer

-- 1. Remover constraint antiga
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;

-- 2. Adicionar nova constraint com todos os métodos permitidos
ALTER TABLE bills ADD CONSTRAINT bills_payment_method_check 
CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'other', 'boleto', 'bank_transfer'));

-- 3. Verificar se a constraint foi criada corretamente
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'bills_payment_method_check';

-- Pronto! Agora a tabela bills aceita os métodos: credit_card, debit_card, pix, cash, other, boleto, bank_transfer

