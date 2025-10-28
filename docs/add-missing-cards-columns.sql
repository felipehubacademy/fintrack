-- ============================================
-- ADICIONAR COLUNAS FALTANTES NA TABELA CARDS
-- ============================================

-- 1. Renomear card_type para type (se card_type existir e type não existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'card_type')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'type') THEN
    ALTER TABLE cards RENAME COLUMN card_type TO type;
  END IF;
END $$;

-- 2. Adicionar coluna type (se não existir)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'credit' CHECK (type IN ('credit', 'debit', 'prepaid'));

-- 3. Adicionar coluna holder_name
ALTER TABLE cards ADD COLUMN IF NOT EXISTS holder_name TEXT;

-- 4. Adicionar coluna credit_limit
ALTER TABLE cards ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2);

-- 5. Adicionar coluna available_limit
ALTER TABLE cards ADD COLUMN IF NOT EXISTS available_limit DECIMAL(12,2);

-- 6. Adicionar coluna best_day
ALTER TABLE cards ADD COLUMN IF NOT EXISTS best_day INTEGER CHECK (best_day IS NULL OR (best_day >= 1 AND best_day <= 31));

-- 7. Adicionar coluna owner_id
ALTER TABLE cards ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

-- 8. Adicionar coluna closing_day (se não existir)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS closing_day INTEGER CHECK (closing_day IS NULL OR (closing_day >= 1 AND closing_day <= 31));

-- 9. Adicionar coluna color (se não existir)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'bg-blue-600';

-- 10. Verificar se billing_day é NOT NULL, caso contrário adicionar constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cards' 
    AND column_name = 'billing_day' 
    AND is_nullable = 'YES'
  ) THEN
    -- Tornar billing_day NOT NULL se todos os registros existentes tiverem valor
    UPDATE cards SET billing_day = 15 WHERE billing_day IS NULL;
    ALTER TABLE cards ALTER COLUMN billing_day SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Se houver erro, apenas logar (não falhar todo o script)
  RAISE NOTICE 'Não foi possível tornar billing_day NOT NULL: %', SQLERRM;
END $$;

-- 11. Adicionar constraint para billing_day se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cards_billing_day_check'
  ) THEN
    ALTER TABLE cards ADD CONSTRAINT cards_billing_day_check 
    CHECK (billing_day >= 1 AND billing_day <= 31);
  END IF;
END $$;

-- 12. Verificar colunas adicionadas
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cards'
ORDER BY ordinal_position;

