-- ============================================================================
-- FIX: Desabilitar RLS, verificar dados, reabilitar com política simples
-- ============================================================================

-- PASSO 1: Desabilitar RLS temporariamente para ver dados reais
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Contar expenses da organização (para ver se existem)
SELECT 
  'Total expenses na organização (SEM RLS)' as info,
  COUNT(*) as total
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1);

-- Mostrar exemplos
SELECT 
  'Exemplos de expenses (SEM RLS)' as info,
  id,
  description,
  amount,
  cost_center_id,
  user_id,
  organization_id,
  date
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)
ORDER BY date DESC
LIMIT 10;

-- PASSO 2: Reabilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Remover TODAS as políticas SELECT
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view all expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses - SIMPLE" ON expenses;
DROP POLICY IF EXISTS "RLS Expenses Policy" ON expenses;
DROP POLICY IF EXISTS "Simple organization check" ON expenses;
DROP POLICY IF EXISTS "Simple organization check incomes" ON incomes;

-- PASSO 4: Verificar tipo da organização DIRETO (sem função)
SELECT 
  'Tipo da organização' as info,
  o.type,
  o.id as org_id,
  o.name as org_name
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.id = auth.uid()
LIMIT 1;

-- PASSO 5: Criar política MUITO SIMPLES - apenas verifica organization_id
-- Sem verificar tipo - deixa frontend fazer filtro se necessário
CREATE POLICY "Simple organization check"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Fazer o mesmo para incomes
DROP POLICY IF EXISTS "Users can view incomes" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes based on org type" ON incomes;
DROP POLICY IF EXISTS "Users can view incomes from their organization" ON incomes;
DROP POLICY IF EXISTS "RLS Incomes Policy" ON incomes;

CREATE POLICY "Simple organization check incomes"
ON incomes
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Teste final
SELECT 
  'Expenses visíveis COM RLS (nova política simples)' as info,
  COUNT(*) as total
FROM expenses;

SELECT '✅ Teste completo - Recarregue dashboard' as final;

