-- ============================================================================
-- TESTE FINAL: Desabilitar RLS completamente para verificar
-- ============================================================================
-- Se aparecerem expenses sem RLS = problema é RLS
-- Se NÃO aparecerem sem RLS = problema são os dados
-- ============================================================================

-- DESABILITAR RLS EM TUDO
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;

-- Verificar quantas expenses existem
SELECT 
  'RLS DESABILITADO - Total expenses da sua org' as info,
  COUNT(*)::text as total
FROM expenses
WHERE organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1
);

-- Mostrar exemplos
SELECT 
  'Exemplos de expenses (RLS DESABILITADO)' as info,
  id,
  description,
  amount,
  cost_center_id,
  organization_id,
  date
FROM expenses
WHERE organization_id = (
  SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1
)
ORDER BY date DESC
LIMIT 10;

-- Verificar dados do usuário
SELECT 
  'Dados do usuário' as info,
  u.id::text as user_id,
  u.email,
  u.organization_id::text as user_org_id,
  o.id::text as org_id_check,
  o.type as org_type,
  o.name as org_name
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
WHERE u.id = auth.uid();

-- AGORA RECARREGUE O DASHBOARD E VEJA SE APARECEM AS EXPENSES
-- Se aparecerem = problema era RLS, vamos corrigir
-- Se NÃO aparecerem = problema são os dados (organization_id incorreto)

SELECT 
  '⚠️ RLS DESABILITADO - Recarregue dashboard AGORA e me diga se viu expenses!' as instrucao,
  'Se aparecerem: problema era RLS' as se_aparecerem,
  'Se NÃO aparecerem: problema são os dados' as se_nao_aparecerem;

