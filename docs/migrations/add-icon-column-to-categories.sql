-- ============================================
-- MIGRATION: Adicionar coluna 'icon' para emojis
-- ============================================
-- Descrição: Separa emoji (icon) de descrição textual
--            nas categorias de orçamento
-- ============================================

-- 1. Adicionar coluna 'icon' para armazenar emojis
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS icon VARCHAR(10);

-- 2. Migrar emojis existentes de 'description' para 'icon'
-- (Apenas se description parecer ser um emoji - 1-4 caracteres)
UPDATE budget_categories 
SET icon = description,
    description = NULL
WHERE description IS NOT NULL 
  AND LENGTH(description) <= 4
  AND description ~ '[^\x00-\x7F]'; -- Contém caracteres Unicode (emojis)

-- 3. Criar índice para busca por icon (opcional, mas útil)
CREATE INDEX IF NOT EXISTS idx_budget_categories_icon 
ON budget_categories(icon) 
WHERE icon IS NOT NULL;

-- 4. Adicionar comentários
COMMENT ON COLUMN budget_categories.icon IS 'Emoji ou ícone visual da categoria (ex: 🍽️, 🚗, 🏥)';
COMMENT ON COLUMN budget_categories.description IS 'Descrição textual da categoria (ex: "Gastos com alimentação fora de casa")';

-- 5. Verificar resultado
SELECT 
  name,
  icon,
  description,
  is_default,
  created_at
FROM budget_categories
ORDER BY is_default DESC, name;

