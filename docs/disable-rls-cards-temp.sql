-- Desabilitar RLS temporariamente na tabela cards para testes
-- ============================================

-- Desabilitar RLS na tabela cards
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view cards from their organization" ON cards;
DROP POLICY IF EXISTS "Users can insert cards in their organization" ON cards;
DROP POLICY IF EXISTS "Users can update cards in their organization" ON cards;
DROP POLICY IF EXISTS "Users can delete cards in their organization" ON cards;
