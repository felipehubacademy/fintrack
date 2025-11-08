-- Adiciona coluna macro_group em budget_categories

ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS macro_group TEXT NOT NULL DEFAULT 'needs';

ALTER TABLE budget_categories
ADD CONSTRAINT budget_categories_macro_group_check
CHECK (macro_group IN ('needs', 'wants', 'investments'));

CREATE INDEX IF NOT EXISTS idx_budget_categories_macro_group
ON budget_categories (macro_group);

-- Distribuição inicial das categorias padrão
UPDATE budget_categories
SET macro_group = 'needs'
WHERE name ILIKE ANY (ARRAY[
  'alimentação', 'transporte', 'saúde', 'contas', 'casa',
  'moradia', 'energia', 'luz', 'água', 'telecom', 'internet'
]);

UPDATE budget_categories
SET macro_group = 'wants'
WHERE name ILIKE ANY (ARRAY[
  'lazer', 'educação', 'outros', 'viagens', 'assinaturas',
  'restaurantes', 'hobbies', 'roupas'
]);

UPDATE budget_categories
SET macro_group = 'investments'
WHERE name ILIKE ANY (ARRAY[
  'investimentos', 'poupança', 'reserva', 'fundo', 'fii',
  'tesouro', 'ações', 'cripto'
]);

