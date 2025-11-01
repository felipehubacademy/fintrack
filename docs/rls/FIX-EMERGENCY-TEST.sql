-- ============================================================================
-- TESTE DE EMERGÊNCIA: Verificar se problema é RLS ou dados
-- ============================================================================

-- TESTE 1: Desabilitar RLS completamente e ver quantas expenses aparecem
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;

SELECT 
  '⚠️ RLS DESABILITADO - Quantas expenses existem?' as teste,
  COUNT(*) as total_expenses
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1);

SELECT 
  '⚠️ RLS DESABILITADO - Exemplos' as teste,
  id,
  description,
  amount,
  cost_center_id,
  organization_id,
  date
FROM expenses
WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)
ORDER BY date DESC
LIMIT 5;

-- Se aparecerem muitas expenses aqui, o problema É o RLS
-- Se não aparecerem, o problema são os dados (organization_id incorreto)

-- TESTE 2: Verificar dados do usuário
SELECT 
  'Dados do usuário' as teste,
  u.id as user_id,
  u.email,
  u.organization_id,
  o.id as org_id_check,
  o.type as org_type,
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.id = auth.uid();

-- TESTE 3: Verificar expenses da organização (sem usar função)
SELECT 
  'Expenses direto da organização' as teste,
  COUNT(*) as total
FROM expenses
WHERE organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1
);

-- AGORA: Reabilitar RLS e criar política que FUNCIONA
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits ENABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas
DROP POLICY IF EXISTS "View expenses by organization" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "RLS Expenses Policy" ON expenses;
DROP POLICY IF EXISTS "Simple organization check" ON expenses;

-- Criar política que usa JOIN DIRETO (sem função helper)
CREATE POLICY "Direct organization check"
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

-- Teste final
SELECT 
  '✅ COM RLS (nova política) - Quantas visíveis?' as teste,
  COUNT(*) as expenses_visiveis
FROM expenses;

SELECT '✅ Execute este script e me envie TODAS as tabelas de resultado' as instrucao;

