-- ============================================================================
-- TESTE DIRETO: Verificar se política está funcionando
-- ============================================================================

-- Primeiro, vamos desabilitar RLS temporariamente para testar
-- Isso vai nos mostrar se o problema é RLS ou os dados em si
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- Agora contar expenses (sem RLS)
SELECT 
  '1. Expenses SEM RLS' as teste,
  COUNT(*) as total,
  'Se aparecer muitos, RLS estava bloqueando' as observacao
FROM expenses
WHERE expenses.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1);

-- Mostrar algumas expenses
SELECT 
  '2. Exemplos SEM RLS' as teste,
  id,
  description,
  cost_center_id,
  user_id,
  organization_id
FROM expenses
WHERE expenses.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1)
ORDER BY date DESC
LIMIT 5;

-- Reabilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Garantir funções helper
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
BEGIN
  auth_user_id := auth.uid();
  
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
    
    RETURN user_org_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Remover TODAS as políticas
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view all expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses - SIMPLE" ON expenses;

-- Criar política ULTRA SIMPLES (apenas organization_id)
CREATE POLICY "View expenses from organization"
ON expenses
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id()
);

-- Testar COM RLS agora
SELECT 
  '3. Expenses COM RLS (nova política)' as teste,
  COUNT(*) as total_visiveis,
  'Deve mostrar todas da organização' as esperado
FROM expenses;

-- Mostrar exemplos com RLS
SELECT 
  '4. Exemplos COM RLS' as teste,
  id,
  description,
  cost_center_id,
  organization_id
FROM expenses
ORDER BY date DESC
LIMIT 5;

SELECT '✅ Teste concluído!' as resultado;

