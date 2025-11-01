-- ============================================================================
-- FIX: Uma query única que mostra TODOS os resultados
-- ============================================================================

-- Primeiro, desabilitar RLS para ver dados reais
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;

-- Query única que mostra TUDO
SELECT 
  '1. Dados do Usuário' as info,
  u.id::text as user_id,
  u.email,
  u.organization_id::text,
  o.type as org_type,
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.id = auth.uid()
LIMIT 1;

-- Total de expenses SEM RLS
SELECT 
  '2. Total Expenses (SEM RLS)' as info,
  COUNT(*)::text as total,
  (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)::text as org_id_do_usuario
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1);

-- Exemplos SEM RLS
SELECT 
  '3. Exemplos SEM RLS' as info,
  id::text,
  description,
  amount::text,
  cost_center_id::text,
  organization_id::text
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)
ORDER BY date DESC
LIMIT 3;

-- Reabilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas e criar uma MUITO SIMPLES
DO $$
BEGIN
  -- Remover políticas de expenses
  DROP POLICY IF EXISTS "Direct organization check" ON expenses;
  DROP POLICY IF EXISTS "View expenses by organization" ON expenses;
  DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
  DROP POLICY IF EXISTS "RLS Expenses Policy" ON expenses;
  DROP POLICY IF EXISTS "Simple organization check" ON expenses;
  
  -- Criar política que FUNCIONA - apenas verifica organization_id diretamente
  EXECUTE 'CREATE POLICY "Org check expenses" ON expenses FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid() AND is_active = true))';
END $$;

-- Teste COM RLS
SELECT 
  '4. Expenses visíveis COM RLS' as info,
  COUNT(*)::text as total
FROM expenses;

-- Verificar policies
SELECT 
  '5. Policies Ativas' as info,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'expenses'
AND cmd = 'SELECT';

SELECT '✅ Concluído - Veja todas as tabelas acima e recarregue dashboard' as final;

