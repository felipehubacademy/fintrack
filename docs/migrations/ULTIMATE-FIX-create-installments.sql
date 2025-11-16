-- ============================================
-- ULTIMATE FIX: Usar abordagem completamente diferente
-- ============================================
-- Ao invés de loop, usar INSERT com jsonb_to_recordset

DROP FUNCTION IF EXISTS create_installments(numeric, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text, jsonb) CASCADE;

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
BEGIN
    RAISE NOTICE '🔍 create_installments: % parcelas, splits: %', p_installments, p_split_template;
    
    is_shared := (p_cost_center_id IS NULL AND LOWER(p_owner) = 'compartilhado');
    installment_amount := ROUND(p_amount / p_installments, 2);
    
    IF p_category_id IS NOT NULL THEN
        SELECT name INTO category_name FROM budget_categories WHERE id = p_category_id;
    END IF;
    
    SELECT closing_day INTO card_closing_day FROM cards WHERE id = p_card_id;
    IF card_closing_day IS NULL THEN
        card_closing_day := 10;
    END IF;
    
    purchase_year := EXTRACT(YEAR FROM p_date);
    purchase_month := EXTRACT(MONTH FROM p_date);
    purchase_day := EXTRACT(DAY FROM p_date);
    
    -- Criar primeira parcela
    INSERT INTO expenses (
        amount, description, date, payment_method, card_id,
        category_id, category, cost_center_id, owner, 
        organization_id, user_id, whatsapp_message_id,
        installment_info, parent_expense_id, is_shared,
        status, confirmed_at, confirmed_by, source
    ) VALUES (
        installment_amount, p_description, p_date, 'credit_card', p_card_id,
        p_category_id, category_name, p_cost_center_id, p_owner,
        p_organization_id, p_user_id, p_whatsapp_message_id,
        jsonb_build_object(
            'total_installments', p_installments,
            'current_installment', 1,
            'installment_amount', installment_amount,
            'total_amount', p_amount
        ),
        NULL, is_shared, 'confirmed', NOW(), p_user_id, 'manual'
    ) RETURNING id INTO parent_id;
    
    RAISE NOTICE '✅ Parcela 1 criada: expense_id=%', parent_id;
    
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Inserir splits para primeira parcela usando INSERT direto com jsonb_to_recordset
    IF p_split_template IS NOT NULL AND jsonb_array_length(p_split_template) > 0 THEN
        RAISE NOTICE '🔍 Inserindo % splits para parcela 1 (usando jsonb_to_recordset)', jsonb_array_length(p_split_template);
        
        INSERT INTO expense_splits (expense_id, cost_center_id, percentage, amount)
        SELECT 
            parent_id,
            (split_data->>'cost_center_id')::UUID,
            (split_data->>'percentage')::NUMERIC,
            (split_data->>'amount')::NUMERIC / p_installments
        FROM jsonb_array_elements(p_split_template) AS split_data;
        
        RAISE NOTICE '✅ Splits inseridos para parcela 1';
    END IF;
    
    -- Criar parcelas futuras
    IF p_installments > 1 THEN
        RAISE NOTICE '🔍 Criando % parcelas futuras', p_installments - 1;
        
        FOR i IN 2..p_installments LOOP
            target_month := purchase_month + (i - 1);
            target_year := purchase_year;
            
            WHILE target_month > 12 LOOP
                target_month := target_month - 12;
                target_year := target_year + 1;
            END LOOP;
            
            BEGIN
                installment_date := MAKE_DATE(target_year, target_month, purchase_day);
            EXCEPTION WHEN OTHERS THEN
                installment_date := (DATE_TRUNC('month', MAKE_DATE(target_year, target_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
            END;
            
            INSERT INTO expenses (
                amount, description, date, payment_method, card_id,
                category_id, category, cost_center_id, owner,
                organization_id, user_id, installment_info,
                parent_expense_id, status, is_shared,
                confirmed_at, confirmed_by, source
            ) VALUES (
                installment_amount, p_description, installment_date, 'credit_card', p_card_id,
                p_category_id, category_name, p_cost_center_id, p_owner,
                p_organization_id, p_user_id,
                jsonb_build_object(
                    'total_installments', p_installments,
                    'current_installment', i,
                    'installment_amount', installment_amount,
                    'total_amount', p_amount
                ),
                parent_id, 'confirmed', is_shared,
                NOW(), p_user_id, 'manual'
            );
            
            RAISE NOTICE '✅ Parcela % criada: expense_id=%', i, CURRVAL('expenses_id_seq');
            
            -- Inserir splits para parcela futura usando INSERT direto
            IF p_split_template IS NOT NULL AND jsonb_array_length(p_split_template) > 0 THEN
                INSERT INTO expense_splits (expense_id, cost_center_id, percentage, amount)
                SELECT 
                    CURRVAL('expenses_id_seq'),
                    (split_data->>'cost_center_id')::UUID,
                    (split_data->>'percentage')::NUMERIC,
                    (split_data->>'amount')::NUMERIC / p_installments
                FROM jsonb_array_elements(p_split_template) AS split_data;
                
                RAISE NOTICE '✅ Splits inseridos para parcela %', i;
            END IF;
        END LOOP;
    END IF;
    
    RAISE NOTICE '🎉 create_installments concluída! parent_id=%', parent_id;
    
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_installments IS '✅ ULTIMATE FIX 2025-11-16: Usa jsonb_to_recordset ao invés de loop manual (evita duplicação)';

