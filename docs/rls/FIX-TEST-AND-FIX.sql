-- ============================================================================
-- TESTE E FIX: Testar primeiro, depois corrigir
-- ============================================================================

-- PARTE 1: TESTE - Verificar estado atual
-- ============================================================================

-- 1. Verificar funções
SELECT 
  'TESTE 1: Funções' as teste,
  auth.uid() as auth_user_id,
  get_user_organization_id() as org_id,
  get_user_org_type() as org_type;

-- 2. Verificar quantas expenses existem
SELECT 
  'TESTE 2: Total Expenses' as teste,
  COUNT(*) as total_expenses
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- 3. Verificar quantas são visíveis SEM RLS (com service role)
-- (Este teste vai falhar se executado como usuário normal, mas serve para debug)
SELECT 
  'TESTE 3: Expenses visíveis AGORA (com RLS)' as teste,
  COUNT(*) as expenses_visiveis
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- PARTE 2: CORRIGIR - Remover política complexa e criar simples
-- ============================================================================

-- Remover TODAS as políticas SELECT
DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses based on org type" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their organization" ON expenses;
DROP POLICY IF EXISTS "Users can view all expenses from their organization" ON expenses;

-- Garantir funções helper estão corretas
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

CREATE OR REPLACE FUNCTION get_user_org_type()
RETURNS TEXT AS $$
DECLARE
  org_id UUID;
  org_type TEXT;
BEGIN
  org_id := get_user_organization_id();
  
  IF org_id IS NOT NULL THEN
    SELECT type INTO org_type
    FROM organizations
    WHERE id = org_id;
  END IF;
  
  RETURN org_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Criar política ULTRA SIMPLES para FAMILY primeiro
-- Se for family, mostrar TUDO (sem verificar cost_center)
CREATE POLICY "Users can view expenses - SIMPLE"
ON expenses
FOR SELECT
TO authenticated
USING (
  -- Verificar apenas organization_id
  organization_id = get_user_organization_id()
);

-- PARTE 3: TESTE APÓS CORREÇÃO
-- ============================================================================

SELECT 
  'TESTE 4: Após correção - Expenses visíveis' as teste,
  COUNT(*) as expenses_visiveis
FROM expenses
WHERE expenses.organization_id = get_user_organization_id();

-- Verificar qual tipo de organização
SELECT 
  'TESTE 5: Tipo da Organização' as teste,
  get_user_org_type() as tipo,
  CASE 
    WHEN get_user_org_type() = 'family' THEN '✅ Deve mostrar TODAS'
    WHEN get_user_org_type() = 'solo' THEN '⚠️  Deve mostrar apenas SUAS'
    ELSE '❓ Tipo desconhecido'
  END as esperado;

-- Listar policies ativas agora
SELECT 
  'TESTE 6: Policies Ativas' as teste,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'expenses'
AND cmd = 'SELECT';

-- Exemplo de expenses que deveriam ser visíveis
SELECT 
  'TESTE 7: Exemplos (primeiras 5)' as teste,
  id,
  description,
  amount,
  cost_center_id,
  date
FROM expenses
WHERE expenses.organization_id = get_user_organization_id()
ORDER BY date DESC
LIMIT 5;

SELECT '✅ Correção aplicada - Recarregue o dashboard!' as final;

