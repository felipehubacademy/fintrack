-- ============================================
-- ADICIONAR COLUNA CLOSING_DAY NA TABELA CARDS
-- ============================================

-- Adicionar a coluna closing_day (dia de fechamento da fatura)
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS closing_day INTEGER;

-- Adicionar constraint para validar o dia (1-31)
ALTER TABLE cards 
ADD CONSTRAINT check_closing_day 
CHECK (closing_day IS NULL OR (closing_day >= 1 AND closing_day <= 31));

-- Comentário explicativo
COMMENT ON COLUMN cards.closing_day IS 'Dia de fechamento da fatura (1-31). O melhor dia de compra é calculado automaticamente como closing_day + 1.';

-- Atualizar registros existentes: se best_day existe, calcular closing_day
-- closing_day = best_day - 1 (ou 31 se best_day = 1)
UPDATE cards 
SET closing_day = CASE 
    WHEN best_day = 1 THEN 31
    ELSE best_day - 1
END
WHERE best_day IS NOT NULL AND closing_day IS NULL;

-- Índice para queries de fechamento
CREATE INDEX IF NOT EXISTS idx_cards_closing_day ON cards(closing_day);

-- ============================================
-- INSTRUÇÕES
-- ============================================
-- 1. Execute este script no Supabase SQL Editor
-- 2. Verifique os dados: SELECT id, name, billing_day, closing_day, best_day FROM cards;
-- 3. A aplicação agora pedirá closing_day e calculará best_day automaticamente

