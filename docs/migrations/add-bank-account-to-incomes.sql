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

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_incomes_bank_account ON incomes(bank_account_id);

-- 5. Comentário na coluna
COMMENT ON COLUMN incomes.bank_account_id IS 'Conta bancária onde a entrada foi registrada (obrigatório para novas entradas)';

