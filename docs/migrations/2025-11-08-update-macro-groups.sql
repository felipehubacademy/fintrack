-- Ajusta macro_group para categorias de receita e expande constraint

ALTER TABLE budget_categories
DROP CONSTRAINT IF EXISTS budget_categories_macro_group_check;

ALTER TABLE budget_categories
ADD CONSTRAINT budget_categories_macro_group_check
CHECK (macro_group IN ('needs', 'wants', 'investments', 'income'));

-- Normaliza valores eventualmente já salvos como 'recebimentos'
UPDATE budget_categories
SET macro_group = 'income'
WHERE macro_group = 'recebimentos';

-- Define macro_group fixo para categorias de receita
UPDATE budget_categories
SET macro_group = 'income'
WHERE type IN ('income', 'both');


