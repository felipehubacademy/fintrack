-- ============================================
-- CORRIGIR CONSTRAINTS DE CASCADE
-- ============================================
-- Adiciona ON DELETE CASCADE nas foreign keys que estavam sem

-- 1. Corrigir expense_splits
-- ============================================
ALTER TABLE expense_splits 
DROP CONSTRAINT IF EXISTS expense_splits_cost_center_id_fkey;

ALTER TABLE expense_splits 
ADD CONSTRAINT expense_splits_cost_center_id_fkey 
FOREIGN KEY (cost_center_id) 
REFERENCES cost_centers(id) 
ON DELETE CASCADE;

-- 2. Verificar e corrigir income_splits (se existir)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'income_splits'
  ) THEN
    -- Verificar se a constraint existe e tem CASCADE
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'income_splits_cost_center_id_fkey'
    ) THEN
      ALTER TABLE income_splits 
      DROP CONSTRAINT income_splits_cost_center_id_fkey;
      
      ALTER TABLE income_splits 
      ADD CONSTRAINT income_splits_cost_center_id_fkey 
      FOREIGN KEY (cost_center_id) 
      REFERENCES cost_centers(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 3. Verificar e corrigir bill_splits (se existir)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'bill_splits'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'bill_splits_cost_center_id_fkey'
    ) THEN
      ALTER TABLE bill_splits 
      DROP CONSTRAINT bill_splits_cost_center_id_fkey;
      
      ALTER TABLE bill_splits 
      ADD CONSTRAINT bill_splits_cost_center_id_fkey 
      FOREIGN KEY (cost_center_id) 
      REFERENCES cost_centers(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 4. Verificar e corrigir bank_account_shares (se existir)
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'bank_account_shares'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'bank_account_shares_cost_center_id_fkey'
    ) THEN
      ALTER TABLE bank_account_shares 
      DROP CONSTRAINT bank_account_shares_cost_center_id_fkey;
      
      ALTER TABLE bank_account_shares 
      ADD CONSTRAINT bank_account_shares_cost_center_id_fkey 
      FOREIGN KEY (cost_center_id) 
      REFERENCES cost_centers(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

