-- ============================================
-- CRIAR/ATUALIZAR FUNÇÃO create_installments
-- ============================================
-- Esta função cria despesas parceladas no cartão de crédito
-- IMPORTANTE: 1 parcela = "à vista no crédito" (valor total descontado imediatamente)

-- Remover função antiga se existir (com diferentes assinaturas)
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
    card_closing_day INTEGER;
    purchase_year INTEGER;
    purchase_month INTEGER;
    purchase_day INTEGER;
    target_year INTEGER;
    target_month INTEGER;
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
    -- REGRA: No cartão de crédito, TODAS as parcelas (inclusive futuras) são confirmadas imediatamente
    -- porque o valor total já é descontado do limite disponível na hora da compra
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
        NULL, -- Será atualizado abaixo
        is_shared,
        'confirmed', -- Primeira parcela confirmada
        NOW(),
        p_user_id,
        'manual'
    ) RETURNING id INTO parent_id;
    
    -- Atualizar a primeira parcela para referenciar a si mesma
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Se for mais de 1 parcela, criar as parcelas futuras
    -- IMPORTANTE: Todas as parcelas são confirmadas porque o valor total já descontou do limite
    -- IMPORTANTE: Todas as parcelas mantêm o mesmo dia da compra (mesmo dia do mês)
    IF p_installments > 1 THEN
        FOR i IN 2..p_installments LOOP
            -- Calcular qual mês essa parcela deve aparecer na fatura
            -- A parcela i aparece na fatura do mês (i-1) meses após a compra
            target_month := purchase_month + (i - 1);
            target_year := purchase_year;
            
            -- Ajustar ano se necessário
            WHILE target_month > 12 LOOP
                target_month := target_month - 12;
                target_year := target_year + 1;
            END LOOP;
            
            -- Data da parcela = mesmo dia do mês (purchase_day)
            -- Se o dia não existir no mês (ex: dia 31 em fevereiro), usar o último dia do mês
            BEGIN
                installment_date := MAKE_DATE(target_year, target_month, purchase_day);
            EXCEPTION WHEN OTHERS THEN
                -- Se o dia não existe no mês (ex: 31 em fevereiro), usar o último dia do mês
                installment_date := (DATE_TRUNC('month', MAKE_DATE(target_year, target_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
            END;
            
            -- Criar parcela futura (TAMBÉM confirmada, porque o crédito já foi descontado)
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
                parent_id, -- Referência à primeira parcela
                'confirmed', -- TODAS as parcelas são confirmadas (crédito já descontado)
                is_shared,
                NOW(), -- Confirmada na data da compra
                p_user_id, -- Confirmada pelo usuário que fez a compra
                'manual'
            );
        END LOOP;
    END IF;
    
    -- Retornar ID da primeira parcela (despesa pai)
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION create_installments IS 'Cria despesas parceladas no cartão de crédito. Todas as parcelas (inclusive futuras) são confirmadas imediatamente porque o valor total já é descontado do limite disponível na hora da compra.';
