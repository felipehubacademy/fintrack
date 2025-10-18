-- Adicionar coluna color à tabela cards
-- ============================================

ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'from-blue-600 to-purple-600';

-- Comentário da coluna
COMMENT ON COLUMN cards.color IS 'Gradient CSS class for card visual styling';
