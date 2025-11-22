-- ============================================================================
-- FUNÇÃO PARA ATUALIZAR PARCELAS DE UM GRUPO
-- ============================================================================
-- Esta função permite atualizar todas as parcelas de um grupo de forma segura
-- ignorando as políticas RLS, pois roda com SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_installment_group(
  p_parent_expense_id BIGINT,
  p_description TEXT,
  p_category_id UUID,
  p_card_id UUID,
  p_owner TEXT,
  p_cost_center_id UUID,
  p_is_shared BOOLEAN,
  p_total_amount NUMERIC,
  p_organization_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  updated_count INTEGER,
  installment_ids BIGINT[]
) AS $$
DECLARE
  v_installment_count INTEGER;
  v_installment_amount NUMERIC;
  v_category_name TEXT;
  v_installment_record RECORD;
  v_ids BIGINT[];
BEGIN
  -- Validar que o usuário pertence à organização
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id 
    AND organization_id = p_organization_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Usuário não autorizado para esta organização';
  END IF;

  -- Validar que as parcelas pertencem à organização
  IF NOT EXISTS (
    SELECT 1 FROM expenses 
    WHERE (id = p_parent_expense_id OR parent_expense_id = p_parent_expense_id)
    AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Parcelas não encontradas ou não pertencem à organização';
  END IF;

  -- Buscar nome da categoria se fornecida
  IF p_category_id IS NOT NULL THEN
    SELECT name INTO v_category_name FROM budget_categories WHERE id = p_category_id;
  END IF;

  -- Contar parcelas e calcular valor por parcela
  SELECT COUNT(*) INTO v_installment_count
  FROM expenses
  WHERE id = p_parent_expense_id OR parent_expense_id = p_parent_expense_id;

  v_installment_amount := ROUND(p_total_amount / v_installment_count, 2);

  -- Atualizar todas as parcelas (SEM alterar as datas!)
  v_ids := ARRAY[]::BIGINT[];
  
  FOR v_installment_record IN
    SELECT id, installment_info
    FROM expenses
    WHERE id = p_parent_expense_id OR parent_expense_id = p_parent_expense_id
    ORDER BY id
  LOOP
    UPDATE expenses
    SET
      description = p_description,
      category_id = p_category_id,
      category = v_category_name,
      amount = v_installment_amount,
      card_id = p_card_id,
      owner = p_owner,
      cost_center_id = p_cost_center_id,
      is_shared = p_is_shared,
      installment_info = jsonb_set(
        jsonb_set(
          jsonb_set(
            COALESCE(v_installment_record.installment_info, '{}'::jsonb),
            '{total_amount}',
            to_jsonb(p_total_amount)
          ),
          '{installment_amount}',
          to_jsonb(v_installment_amount)
        ),
        '{total_installments}',
        to_jsonb(v_installment_count)
      ),
      updated_at = NOW()
      -- IMPORTANTE: NÃO atualiza o campo 'date' para manter as datas originais de cada parcela
    WHERE id = v_installment_record.id;
    
    v_ids := array_append(v_ids, v_installment_record.id);
  END LOOP;

  RETURN QUERY SELECT v_installment_count, v_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função
COMMENT ON FUNCTION update_installment_group IS 
'Atualiza todas as parcelas de um grupo de forma segura, validando que o usuário pertence à organização';

-- Garantir permissões
GRANT EXECUTE ON FUNCTION update_installment_group TO authenticated;

