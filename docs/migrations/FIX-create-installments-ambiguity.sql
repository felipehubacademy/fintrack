-- ============================================
-- FIX: Resolver ambiguidade na função create_installments
-- ============================================
-- Remove todas as versões antigas e cria versão definitiva com split_template

-- 1. Remover TODAS as versões antigas da função
DROP FUNCTION IF EXISTS create_installments(numeric, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS create_installments(decimal, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS create_installments(numeric, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS create_installments(decimal, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text, jsonb);

-- 2. Criar versão DEFINITIVA com split_template
CREATE OR REPLACE FUNCTION create_installments(
    p_amount DECIMAL,
    p_installments INTEGER,
    p_description TEXT,
    p_date DATE,
    p_card_id UUID,
    p_category_id UUID,
    p_cost_center_id UUID,
    p_owner TEXT,
    p_organization_id UUID,
    p_user_id UUID,
    p_whatsapp_message_id TEXT DEFAULT NULL,
    p_split_template JSONB DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    parent_id BIGINT;
    installment_amount DECIMAL(10,2);
    installment_date DATE;
    i INTEGER;
    is_shared BOOLEAN;
    category_name TEXT;
    card_closing_day INTEGER;
    purchase_year INTEGER;
    purchase_month INTEGER;
    purchase_day INTEGER;
    target_year INTEGER;
    target_month INTEGER;
    split_item JSONB;
BEGIN
    -- Determinar se é despesa compartilhada
    is_shared := (p_cost_center_id IS NULL AND LOWER(p_owner) = 'compartilhado');
    
    -- Calcular valor da parcela
    installment_amount := ROUND(p_amount / p_installments, 2);
    
    -- Buscar nome da categoria se category_id foi fornecido
    IF p_category_id IS NOT NULL THEN
        SELECT name INTO category_name FROM budget_categories WHERE id = p_category_id;
    END IF;
    
    -- Buscar closing_day do cartão (dia de fechamento da fatura)
    SELECT closing_day INTO card_closing_day FROM cards WHERE id = p_card_id;
    
    -- Se não houver closing_day definido, usar o dia 10 como padrão
    IF card_closing_day IS NULL THEN
        card_closing_day := 10;
    END IF;
    
    -- Extrair ano, mês e dia da data de compra
    purchase_year := EXTRACT(YEAR FROM p_date);
    purchase_month := EXTRACT(MONTH FROM p_date);
    purchase_day := EXTRACT(DAY FROM p_date);
    
    -- Criar despesa "pai" (primeira parcela)
    INSERT INTO expenses (
        amount, 
        description, 
        date, 
        payment_method, 
        card_id,
        category_id, 
        category,
        cost_center_id, 
        owner, 
        organization_id, 
        user_id,
        whatsapp_message_id, 
        installment_info, 
        parent_expense_id, 
        is_shared,
        status, 
        confirmed_at, 
        confirmed_by, 
        source
    ) VALUES (
        installment_amount, 
        p_description, 
        p_date, 
        'credit_card', 
        p_card_id,
        p_category_id, 
        category_name,
        p_cost_center_id, 
        p_owner, 
        p_organization_id, 
        p_user_id,
        p_whatsapp_message_id,
        jsonb_build_object(
            'total_installments', p_installments,
            'current_installment', 1,
            'installment_amount', installment_amount,
            'total_amount', p_amount
        ),
        NULL,
        is_shared,
        'confirmed',
        NOW(),
        p_user_id,
        'manual'
    ) RETURNING id INTO parent_id;
    
    -- Atualizar a primeira parcela para referenciar a si mesma
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Se houver split_template, inserir splits para a primeira parcela
    IF p_split_template IS NOT NULL AND jsonb_array_length(p_split_template) > 0 THEN
        FOR split_item IN SELECT jsonb_array_elements(p_split_template)
        LOOP
            INSERT INTO expense_splits (
                expense_id,
                cost_center_id,
                percentage,
                amount
            ) VALUES (
                parent_id,
                (split_item->>'cost_center_id')::UUID,
                (split_item->>'percentage')::NUMERIC,
                (split_item->>'amount')::NUMERIC
            );
        END LOOP;
    END IF;
    
    -- Se for mais de 1 parcela, criar as parcelas futuras
    IF p_installments > 1 THEN
        FOR i IN 2..p_installments LOOP
            -- Calcular qual mês essa parcela deve aparecer na fatura
            target_month := purchase_month + (i - 1);
            target_year := purchase_year;
            
            -- Ajustar ano se necessário
            WHILE target_month > 12 LOOP
                target_month := target_month - 12;
                target_year := target_year + 1;
            END LOOP;
            
            -- Data da parcela = mesmo dia do mês (purchase_day)
            BEGIN
                installment_date := MAKE_DATE(target_year, target_month, purchase_day);
            EXCEPTION WHEN OTHERS THEN
                installment_date := (DATE_TRUNC('month', MAKE_DATE(target_year, target_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
            END;
            
            -- Criar parcela futura
            INSERT INTO expenses (
                amount, 
                description, 
                date, 
                payment_method, 
                card_id,
                category_id, 
                category,
                cost_center_id, 
                owner, 
                organization_id, 
                user_id,
                installment_info, 
                parent_expense_id, 
                status, 
                is_shared,
                confirmed_at,
                confirmed_by,
                source
            ) VALUES (
                installment_amount, 
                p_description, 
                installment_date, 
                'credit_card', 
                p_card_id,
                p_category_id, 
                category_name,
                p_cost_center_id, 
                p_owner, 
                p_organization_id, 
                p_user_id,
                jsonb_build_object(
                    'total_installments', p_installments,
                    'current_installment', i,
                    'installment_amount', installment_amount,
                    'total_amount', p_amount
                ),
                parent_id,
                'confirmed',
                is_shared,
                NOW(),
                p_user_id,
                'manual'
            );
            
            -- Se houver split_template, inserir splits para cada parcela
            IF p_split_template IS NOT NULL AND jsonb_array_length(p_split_template) > 0 THEN
                FOR split_item IN SELECT jsonb_array_elements(p_split_template)
                LOOP
                    INSERT INTO expense_splits (
                        expense_id,
                        cost_center_id,
                        percentage,
                        amount
                    ) VALUES (
                        CURRVAL('expenses_id_seq'),
                        (split_item->>'cost_center_id')::UUID,
                        (split_item->>'percentage')::NUMERIC,
                        (split_item->>'amount')::NUMERIC / p_installments
                    );
                END LOOP;
            END IF;
        END LOOP;
    END IF;
    
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_installments IS 'Cria despesas parceladas no cartão de crédito com suporte a splits. Todas as parcelas são confirmadas imediatamente.';

-- 3. Atualizar create_bulk_card_expenses para usar a nova assinatura
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

    IF amount IS NULL OR amount <= 0 THEN
      RAISE EXCEPTION 'Valor deve ser maior que zero na linha %', idx;
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

    -- Chamar create_installments com tipos explícitos
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

    IF is_shared THEN
      UPDATE expenses
      SET owner = responsibility_name,
          is_shared = true
      WHERE id = parent_id
         OR parent_expense_id = parent_id;
    END IF;

    parent_ids := array_append(parent_ids, parent_id);
    total_value := total_value + amount;
  END LOOP;

  IF total_value > 0 THEN
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

COMMENT ON FUNCTION create_bulk_card_expenses IS 'Insere transações de cartão de crédito em massa, respeitando parcelamentos e atualização do limite disponível.';

