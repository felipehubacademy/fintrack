-- ============================================================================
-- DIAGNÓSTICO FINAL: Identificar exatamente onde está o problema
-- ============================================================================

-- 1. Verificar dados do usuário atual
SELECT 
  '1. DADOS DO USUÁRIO' as etapa,
  auth.uid()::text as user_id,
  u.email,
  u.organization_id::text,
  u.is_active,
  o.id::text as org_id_check,
  o.type as org_type,
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.id = auth.uid()
LIMIT 1;

-- 2. Contar expenses TOTAL (sem RLS - desabilitando temporariamente)
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
SELECT 
  '2. TOTAL EXPENSES SEM RLS' as etapa,
  COUNT(*)::text as total,
  (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)::text as sua_org_id
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 3. Contar expenses COM RLS (deve ser igual se política funciona)
SELECT 
  '3. EXPENSES COM RLS' as etapa,
  COUNT(*)::text as total
FROM expenses;

-- 4. Verificar políticas ativas
SELECT 
  '4. POLÍTICAS ATIVAS' as etapa,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'expenses'
AND cmd = 'SELECT';

-- 5. Testar política diretamente
SELECT 
  '5. TESTE POLÍTICA DIRETA' as etapa,
  COUNT(*)::text as deve_mostrar_todas_da_org
FROM expenses
WHERE EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.organization_id = expenses.organization_id
  AND users.is_active = true
);

-- 6. Exemplos de expenses (para verificar dados)
SELECT 
  '6. EXEMPLOS DE EXPENSES' as etapa,
  id::text,
  LEFT(description, 30) as desc_short,
  amount,
  cost_center_id::text,
  organization_id::text,
  date
FROM expenses
ORDER BY date DESC
LIMIT 5;

SELECT '⚠️ Compare tabela 2 (SEM RLS) com tabela 3 (COM RLS)' as instrucao;
SELECT 'Se forem diferentes, RLS está bloqueando' as se_diferentes;
SELECT 'Se forem iguais, problema não é RLS' as se_iguais;
