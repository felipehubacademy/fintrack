-- ============================================
-- ADICIONAR COLUNA card_id À TABELA EXPENSES EXISTENTE
-- ============================================

-- 1. Adicionar coluna card_id se não existir
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES cards(id);

-- 2. Adicionar coluna installment_info se não existir
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS installment_info JSONB;

-- 3. Adicionar coluna parent_expense_id se não existir (sem FK por enquanto)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS parent_expense_id BIGINT;

-- 4. Verificar se as colunas foram adicionadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses' 
AND column_name IN ('card_id', 'installment_info', 'parent_expense_id')
ORDER BY column_name;
