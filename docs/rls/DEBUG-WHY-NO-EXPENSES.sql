-- ============================================================================
-- DEBUG: Por que expenses individuais não aparecem?
-- Execute este script para diagnosticar o problema
-- ============================================================================

DO $$
DECLARE
  auth_user_id UUID;
  user_org_id UUID;
  org_type TEXT;
  user_cost_center_id UUID;
  expense_count_total INTEGER;
  expense_count_by_user_id INTEGER;
  expense_count_by_cost_center INTEGER;
  expense_count_visible INTEGER;
  sample_expense RECORD;
BEGIN
  -- Obter dados do usuário autenticado
  auth_user_id := auth.uid();
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 DIAGNÓSTICO DETALHADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth User ID: %', COALESCE(auth_user_id::TEXT, 'NULL');
  
  -- Buscar organization_id
  IF auth_user_id IS NOT NULL THEN
    SELECT organization_id INTO user_org_id
    FROM users
    WHERE id = auth_user_id AND is_active = true
    LIMIT 1;
  END IF;
  
  RAISE NOTICE 'Organization ID: %', COALESCE(user_org_id::TEXT, 'NULL');
  
  -- Buscar tipo da organização
  IF user_org_id IS NOT NULL THEN
    SELECT type INTO org_type
    FROM organizations
    WHERE id = user_org_id;
    
    RAISE NOTICE 'Tipo da organização: %', COALESCE(org_type, 'NULL');
  END IF;
  
  -- Buscar cost_center do usuário
  IF auth_user_id IS NOT NULL AND user_org_id IS NOT NULL THEN
    SELECT id INTO user_cost_center_id
    FROM cost_centers
    WHERE organization_id = user_org_id 
    AND user_id = auth_user_id 
    AND is_active = true
    LIMIT 1;
    
    RAISE NOTICE 'Cost Center ID: %', COALESCE(user_cost_center_id::TEXT, 'NULL');
  END IF;
  
  -- Contar expenses
  IF user_org_id IS NOT NULL THEN
    -- Total de expenses na organização
    SELECT COUNT(*) INTO expense_count_total
    FROM expenses
    WHERE organization_id = user_org_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTATÍSTICAS DE EXPENSES';
    RAISE NOTICE 'Total na organização: %', expense_count_total;
    
    -- Expenses com user_id do usuário
    SELECT COUNT(*) INTO expense_count_by_user_id
    FROM expenses
    WHERE organization_id = user_org_id
    AND user_id = auth_user_id;
    
    RAISE NOTICE 'Com user_id = %: %', auth_user_id, expense_count_by_user_id;
    
    -- Expenses com cost_center_id do usuário
    IF user_cost_center_id IS NOT NULL THEN
      SELECT COUNT(*) INTO expense_count_by_cost_center
      FROM expenses
      WHERE organization_id = user_org_id
      AND cost_center_id = user_cost_center_id;
      
      RAISE NOTICE 'Com cost_center_id = %: %', user_cost_center_id, expense_count_by_cost_center;
    ELSE
      RAISE NOTICE 'Com cost_center_id (não encontrado): 0';
    END IF;
    
    -- Expenses que DEVERIAM ser visíveis pela política
    IF org_type = 'family' THEN
      expense_count_visible := expense_count_total;
      RAISE NOTICE '';
      RAISE NOTICE '✅ Modo FAMILY: todas devem ser visíveis';
      RAISE NOTICE 'Expenses visíveis esperadas: %', expense_count_visible;
    ELSIF org_type = 'solo' THEN
      SELECT COUNT(*) INTO expense_count_visible
      FROM expenses
      WHERE organization_id = user_org_id
      AND (user_id = auth_user_id OR cost_center_id = user_cost_center_id);
      
      RAISE NOTICE '';
      RAISE NOTICE '✅ Modo SOLO: apenas próprias';
      RAISE NOTICE 'Expenses visíveis esperadas: %', expense_count_visible;
    ELSE
      RAISE WARNING '⚠️  Tipo de organização desconhecido: %', org_type;
    END IF;
    
    -- Mostrar exemplo de expense
    SELECT * INTO sample_expense
    FROM expenses
    WHERE organization_id = user_org_id
    LIMIT 1;
    
    IF sample_expense.id IS NOT NULL THEN
      RAISE NOTICE '';
      RAISE NOTICE '📝 EXEMPLO DE EXPENSE';
      RAISE NOTICE 'ID: %', sample_expense.id;
      RAISE NOTICE 'Description: %', sample_expense.description;
      RAISE NOTICE 'user_id: %', COALESCE(sample_expense.user_id::TEXT, 'NULL');
      RAISE NOTICE 'cost_center_id: %', COALESCE(sample_expense.cost_center_id::TEXT, 'NULL');
      RAISE NOTICE 'organization_id: %', sample_expense.organization_id;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
END $$;

-- Testar as funções helper
SELECT 
  'get_user_organization_id()' as function_name,
  get_user_organization_id() as result;
  
SELECT 
  'get_user_org_type()' as function_name,
  get_user_org_type() as result;
  
SELECT 
  'get_current_user_id()' as function_name,
  get_current_user_id() as result;
  
SELECT 
  'get_user_cost_center_id()' as function_name,
  get_user_cost_center_id() as result;

