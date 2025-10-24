-- Corrigir função create_installments para que todas as parcelas sejam confirmadas
-- e consumam o crédito do cartão imediatamente
DROP FUNCTION IF EXISTS create_installments(numeric,integer,text,date,uuid,uuid,uuid,text,uuid,uuid,text);

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
    p_whatsapp_message_id TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
    parent_id BIGINT;
    installment_amount DECIMAL(10,2);
    installment_date DATE;
    i INTEGER;
    is_shared BOOLEAN;
    category_name TEXT;
BEGIN
    is_shared := (p_cost_center_id IS NULL AND LOWER(p_owner) = 'compartilhado');
    installment_amount := ROUND(p_amount / p_installments, 2);
    
    -- Buscar nome da categoria se category_id foi fornecido
    IF p_category_id IS NOT NULL THEN
        SELECT name INTO category_name FROM budget_categories WHERE id = p_category_id;
    END IF;
    
    -- Criar despesa "pai" (primeira parcela) - CONFIRMADA
    INSERT INTO expenses (
        amount, description, date, payment_method, card_id,
        category_id, category, cost_center_id, owner, organization_id, user_id,
        whatsapp_message_id, installment_info, parent_expense_id, split,
        status, confirmed_at, confirmed_by, source
    ) VALUES (
        installment_amount, p_description, p_date, 'credit_card', p_card_id,
        p_category_id, category_name, p_cost_center_id, p_owner, p_organization_id, p_user_id,
        p_whatsapp_message_id,
        jsonb_build_object(
            'total_installments', p_installments,
            'current_installment', 1,
            'installment_amount', installment_amount,
            'total_amount', p_amount
        ),
        NULL,
        is_shared,
        'confirmed',  -- ✅ PRIMEIRA PARCELA CONFIRMADA
        NOW(),
        p_user_id,
        'manual'
    ) RETURNING id INTO parent_id;
    
    -- Atualizar a primeira parcela para referenciar a si mesma
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Criar parcelas futuras APENAS se for 2x ou mais (2+) - TODAS CONFIRMADAS
    IF p_installments > 1 THEN
        FOR i IN 2..p_installments LOOP
            installment_date := p_date + (i - 1) * INTERVAL '1 month';
            
            INSERT INTO expenses (
                amount, description, date, payment_method, card_id,
                category_id, category, cost_center_id, owner, organization_id, user_id,
                installment_info, parent_expense_id, status, split, source,
                confirmed_at, confirmed_by  -- ✅ PARCELAS FUTURAS TAMBÉM CONFIRMADAS
            ) VALUES (
                installment_amount, p_description, installment_date, 'credit_card', p_card_id,
                p_category_id, category_name, p_cost_center_id, p_owner, p_organization_id, p_user_id,
                jsonb_build_object(
                    'total_installments', p_installments,
                    'current_installment', i,
                    'installment_amount', installment_amount,
                    'total_amount', p_amount
                ),
                parent_id,
                'confirmed',  -- ✅ PARCELAS FUTURAS CONFIRMADAS
                is_shared,
                'manual',
                NOW(),        -- ✅ confirmed_at
                p_user_id     -- ✅ confirmed_by
            );
        END LOOP;
    END IF;
    
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;
