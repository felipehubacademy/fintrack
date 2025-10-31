-- ============================================================================
-- Migration: Adicionar bank_account_id obrigatório à tabela incomes
-- Data: 31/10/2025
-- Descrição: Toda entrada financeira deve ser vinculada obrigatoriamente a uma conta bancária
-- ============================================================================

-- 1. Adicionar coluna bank_account_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incomes' AND column_name = 'bank_account_id'
  ) THEN
    ALTER TABLE incomes 
    ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Para registros existentes sem conta, você pode:
--    a) Deletar entradas sem conta (não recomendado se houver dados importantes)
--    b) Associar a uma conta padrão (exemplo abaixo - comentado)
--    c) Tornar obrigatório apenas para novos registros (deixar NULL permitido temporariamente)

-- Exemplo (opcional): Associar entradas existentes a uma conta padrão
-- UPDATE incomes 
-- SET bank_account_id = (
--   SELECT id FROM bank_accounts 
--   WHERE organization_id = incomes.organization_id 
--   AND is_active = true 
--   LIMIT 1
-- )
-- WHERE bank_account_id IS NULL;

-- 3. Tornar a coluna NOT NULL (após atualizar registros existentes ou decidir estratégia)
-- IMPORTANTE: Execute o UPDATE acima antes de fazer isso, ou defina uma conta padrão
-- ALTER TABLE incomes ALTER COLUMN bank_account_id SET NOT NULL;

-- 4. Adicionar payment_method se não existir (métodos de recebimento específicos para incomes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incomes' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE incomes 
    ADD COLUMN payment_method TEXT DEFAULT 'deposit';
    
    -- Adicionar constraint para validar os valores específicos de incomes
    ALTER TABLE incomes DROP CONSTRAINT IF EXISTS incomes_payment_method_check;
    ALTER TABLE incomes ADD CONSTRAINT incomes_payment_method_check 
    CHECK (payment_method IN ('cash', 'pix', 'deposit', 'bank_transfer', 'boleto', 'other'));
    
    -- Atualizar registros existentes para ter um valor padrão
    UPDATE incomes SET payment_method = 'deposit' WHERE payment_method IS NULL;
    
    COMMENT ON COLUMN incomes.payment_method IS 'Forma de recebimento: cash (Dinheiro), pix (PIX), deposit (Depósito), bank_transfer (Transferência Bancária/TED/DOC), boleto (Boleto), other (Outros)';
  END IF;
END $$;

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_incomes_bank_account ON incomes(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_incomes_payment_method ON incomes(payment_method);

-- 6. Comentário na coluna
COMMENT ON COLUMN incomes.bank_account_id IS 'Conta bancária onde a entrada foi registrada (obrigatório para novas entradas)';

