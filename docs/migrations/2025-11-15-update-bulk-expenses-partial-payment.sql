-- Atualiza RPC create_bulk_card_expenses para suportar is_partial_payment e valores negativos

DROP FUNCTION IF EXISTS create_bulk_card_expenses(uuid, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION create_bulk_card_expenses(
  p_card_id UUID,
  p_organization_id UUID,
  p_user_id UUID,
  p_transactions JSONB
)
RETURNS JSON AS $$
DECLARE
  transaction_item JSONB;
  idx INTEGER := 0;
  parent_id BIGINT;
  parent_ids BIGINT[] := '{}';
  total_value NUMERIC := 0;
  owner_for_rpc TEXT;
  responsibility_name TEXT;
  cost_center_id UUID;
  is_shared BOOLEAN;
  is_partial_payment BOOLEAN;
  description TEXT;
  transaction_date DATE;
  category_id UUID;
  installments INTEGER;
  amount NUMERIC;
BEGIN
  IF p_card_id IS NULL THEN
    RAISE EXCEPTION 'p_card_id é obrigatório';
  END IF;

  IF p_organization_id IS NULL THEN
    RAISE EXCEPTION 'p_organization_id é obrigatório';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id é obrigatório';
  END IF;

  IF p_transactions IS NULL OR jsonb_typeof(p_transactions) <> 'array' THEN
    RAISE EXCEPTION 'p_transactions deve ser um array JSON';
  END IF;

  IF jsonb_array_length(p_transactions) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma transação para inserir.';
  END IF;

  FOR transaction_item IN SELECT jsonb_array_elements(p_transactions)
  LOOP
    idx := idx + 1;

    description := COALESCE(trim(transaction_item->>'description'), '');
    transaction_date := (transaction_item->>'date')::DATE;
    category_id := (transaction_item->>'category_id')::UUID;
    installments := COALESCE((transaction_item->>'installments')::INTEGER, 1);
    amount := COALESCE((transaction_item->>'amount')::NUMERIC, 0);
    is_shared := COALESCE((transaction_item->>'is_shared')::BOOLEAN, false);
    is_partial_payment := COALESCE((transaction_item->>'is_partial_payment')::BOOLEAN, false);
    responsibility_name := COALESCE(trim(transaction_item->>'owner_name'), '');
    cost_center_id := (transaction_item->>'cost_center_id')::UUID;

    IF description = '' THEN
      RAISE EXCEPTION 'Descrição é obrigatória na linha %', idx;
    END IF;

    IF transaction_date IS NULL THEN
      RAISE EXCEPTION 'Data é obrigatória na linha %', idx;
    END IF;

    IF category_id IS NULL THEN
      RAISE EXCEPTION 'Categoria é obrigatória na linha %', idx;
    END IF;

    -- Permitir valores negativos para estornos e pagamentos parciais
    IF amount = 0 THEN
      RAISE EXCEPTION 'Valor não pode ser zero na linha %', idx;
    END IF;

    IF installments IS NULL OR installments < 1 THEN
      installments := 1;
    END IF;

    IF installments > 60 THEN
      installments := 60;
    END IF;

    IF is_shared THEN
      owner_for_rpc := 'Compartilhado';
      cost_center_id := NULL;
    ELSE
      IF responsibility_name = '' THEN
        RAISE EXCEPTION 'Responsabilidade é obrigatória na linha %', idx;
      END IF;
      owner_for_rpc := responsibility_name;
    END IF;

    -- Para valores negativos (estornos/pagamentos), criar apenas 1 registro
    IF amount < 0 THEN
      installments := 1;
    END IF;

    parent_id := create_installments(
      amount,
      installments,
      description,
      transaction_date,
      p_card_id,
      category_id,
      cost_center_id,
      owner_for_rpc,
      p_organization_id,
      p_user_id,
      NULL::text,
      NULL::jsonb
    );

    -- Atualizar flags especiais
    IF is_shared OR is_partial_payment THEN
      UPDATE expenses
      SET owner = CASE WHEN is_shared THEN responsibility_name ELSE owner END,
          is_shared = CASE WHEN is_shared THEN true ELSE is_shared END,
          is_partial_payment = CASE WHEN is_partial_payment THEN true ELSE is_partial_payment END
      WHERE id = parent_id
         OR parent_expense_id = parent_id;
    END IF;

    parent_ids := array_append(parent_ids, parent_id);
    total_value := total_value + amount;
  END LOOP;

  -- Atualizar limite disponível (valores negativos aumentam o limite)
  IF total_value <> 0 THEN
    UPDATE cards
    SET available_limit = GREATEST(
      0,
      COALESCE(available_limit, credit_limit, 0) - total_value
    )
    WHERE id = p_card_id;
  END IF;

  RETURN json_build_object(
    'inserted', idx,
    'parent_expense_ids', parent_ids,
    'total_amount', total_value
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_bulk_card_expenses IS 'Insere transações de cartão de crédito em massa, incluindo estornos (valores negativos) e pagamentos parciais.';

