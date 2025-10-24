-- ============================================
-- CRIAR TABELA DE CATEGORIAS DE ENTRADA
-- ============================================
-- Esta tabela armazena as categorias fixas de entradas com suas cores

CREATE TABLE IF NOT EXISTS income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL,
  is_default BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO income_categories (name, color, is_default, display_order) VALUES
  ('Salário', '#10B981', true, 1),
  ('Freelance', '#3B82F6', true, 2),
  ('Investimentos', '#06B6D4', true, 3),
  ('Vendas', '#8B5CF6', true, 4),
  ('Aluguel', '#F59E0B', true, 5),
  ('Bonificação', '#EC4899', true, 6),
  ('Transferência', '#9CA3AF', true, 7),
  ('Outros', '#6B7280', true, 8)
ON CONFLICT (name) DO NOTHING;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_income_categories_name ON income_categories(name);
CREATE INDEX IF NOT EXISTS idx_income_categories_is_default ON income_categories(is_default);

-- Verificar inserção
SELECT id, name, color, is_default, display_order 
FROM income_categories 
ORDER BY display_order;

