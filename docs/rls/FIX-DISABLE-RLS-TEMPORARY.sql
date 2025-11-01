-- ============================================================================
-- SOLUÇÃO TEMPORÁRIA: Desabilitar RLS para confirmar diagnóstico
-- ============================================================================
-- Este script DESABILITA RLS completamente
-- Execute e recarregue dashboard
-- Se aparecerem expenses = problema é RLS, vamos corrigir
-- Se NÃO aparecerem = problema são os dados (organization_id incorreto)
-- ============================================================================

-- DESABILITAR RLS EM TODAS AS TABELAS FINANCEIRAS
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;

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
  LEFT(description, 40) as description,
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

SELECT '⚠️ RLS DESABILITADO - Recarregue dashboard AGORA!' as instrucao;
SELECT 'Se aparecerem expenses = problema era RLS' as se_aparecerem;
SELECT 'Se NÃO aparecerem = problema são os dados' as se_nao_aparecerem;

