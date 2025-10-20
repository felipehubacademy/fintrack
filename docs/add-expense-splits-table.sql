-- ============================================
-- ADICIONAR TABELA expense_splits E OTIMIZAR BANCO
-- ============================================

-- 1. VERIFICAR TIPO DA COLUNA id NA TABELA expenses
-- ============================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'expenses' 
  AND column_name = 'id';

-- 1.1. CRIAR TABELA expense_splits COM TIPO CORRETO
-- ============================================
-- Usando BIGINT para expense_id (compatível com expenses.id)
CREATE TABLE IF NOT EXISTS expense_splits (
    id BIGSERIAL PRIMARY KEY,
    expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que cada cost_center aparece apenas uma vez por despesa
    UNIQUE(expense_id, cost_center_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_cost_center_id ON expense_splits(cost_center_id);

-- ============================================
-- 2. REMOVER COLUNA DESNECESSÁRIA
-- ============================================
ALTER TABLE cost_centers DROP COLUMN IF EXISTS default_card_id;

-- ============================================
-- 3. AJUSTAR PERCENTUAIS DOS COST_CENTERS
-- ============================================

-- Verificar percentuais atuais
SELECT 
    name, 
    type, 
    split_percentage,
    organization_id
FROM cost_centers 
ORDER BY organization_id, type DESC, name;

-- IMPORTANTE: Ajustar percentuais para sua organização
-- Substituir '092adfb3-41d8-4006-bfa5-7035338560e9' pelo ID da sua organização

-- Ajustar cost_centers individuais para divisão igual (50/50)
UPDATE cost_centers 
SET split_percentage = 50.00
WHERE type = 'individual' 
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9';

-- Compartilhado não precisa de split_percentage (é apenas um container)
UPDATE cost_centers 
SET split_percentage = 0.00
WHERE type = 'shared' 
  AND name = 'Compartilhado'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9';

-- ============================================
-- 4. VERIFICAR ESTRUTURA FINAL
-- ============================================

-- Verificar tabela expense_splits
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'expense_splits'
ORDER BY ordinal_position;

-- Verificar cost_centers após ajustes
SELECT 
    name, 
    type, 
    split_percentage,
    color,
    is_active
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035338560e9'
ORDER BY type DESC, name;

-- Verificar se default_card_id foi removido
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'cost_centers' 
  AND column_name = 'default_card_id';
-- Resultado esperado: 0 linhas

-- ============================================
-- 5. HABILITAR RLS (Row Level Security)
-- ============================================

-- Habilitar RLS na nova tabela
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (usuários podem ver splits de despesas da sua organização)
CREATE POLICY "Users can view expense splits from their organization"
ON expense_splits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN users u ON u.id = auth.uid()
    WHERE e.id = expense_splits.expense_id
    AND e.organization_id = u.organization_id
  )
);

-- Política para INSERT (usuários podem criar splits para despesas da sua organização)
CREATE POLICY "Users can create expense splits for their organization"
ON expense_splits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN users u ON u.id = auth.uid()
    WHERE e.id = expense_splits.expense_id
    AND e.organization_id = u.organization_id
  )
);

-- Política para UPDATE (usuários podem atualizar splits de despesas da sua organização)
CREATE POLICY "Users can update expense splits from their organization"
ON expense_splits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN users u ON u.id = auth.uid()
    WHERE e.id = expense_splits.expense_id
    AND e.organization_id = u.organization_id
  )
);

-- Política para DELETE (usuários podem deletar splits de despesas da sua organização)
CREATE POLICY "Users can delete expense splits from their organization"
ON expense_splits FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expenses e
    JOIN users u ON u.id = auth.uid()
    WHERE e.id = expense_splits.expense_id
    AND e.organization_id = u.organization_id
  )
);

-- ============================================
-- 6. TESTE FINAL
-- ============================================

-- Verificar se tudo está correto
SELECT 
    'expense_splits table' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'expense_splits'
    ) THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END as status
UNION ALL
SELECT 
    'RLS enabled',
    CASE WHEN (
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'expense_splits'
    ) THEN '✅ ENABLED' ELSE '❌ DISABLED' END
UNION ALL
SELECT 
    'default_card_id removed',
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cost_centers' AND column_name = 'default_card_id'
    ) THEN '✅ REMOVED' ELSE '❌ STILL EXISTS' END;

-- ============================================
-- CONCLUÍDO! 
-- Execute este script no Supabase SQL Editor
-- ============================================

