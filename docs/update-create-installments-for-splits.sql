-- Atualizar função create_installments para suportar despesas compartilhadas
-- Adiciona o campo 'split' nas parcelas

CREATE OR REPLACE FUNCTION create_installments(
    p_amount DECIMAL,
    p_installments INTEGER,
    p_description TEXT,
    p_date DATE,
    p_card_id UUID,
    p_category_id UUID,
    p_cost_center_id UUID,  -- NULL quando compartilhado
    p_owner TEXT,           -- 'Compartilhado' quando compartilhado
    p_organization_id UUID,
    p_user_id UUID,
    p_whatsapp_message_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    parent_id UUID;
    installment_amount DECIMAL(10,2);
    installment_date DATE;
    i INTEGER;
    is_shared BOOLEAN;
BEGIN
    -- Verificar se é despesa compartilhada
    is_shared := (p_cost_center_id IS NULL AND LOWER(p_owner) = 'compartilhado');
    
    -- Calcular valor da parcela
    installment_amount := ROUND(p_amount / p_installments, 2);
    
    -- Criar despesa "pai" (primeira parcela)
    INSERT INTO expenses (
        amount, description, date, payment_method, card_id,
        category_id, cost_center_id, owner, organization_id, user_id,
        whatsapp_message_id, installment_info, parent_expense_id, split
    ) VALUES (
        installment_amount, p_description, p_date, 'credit_card', p_card_id,
        p_category_id, p_cost_center_id, p_owner, p_organization_id, p_user_id,
        p_whatsapp_message_id,
        jsonb_build_object(
            'total_installments', p_installments,
            'current_installment', 1,
            'installment_amount', installment_amount,
            'total_amount', p_amount
        ),
        NULL,
        is_shared
    ) RETURNING id INTO parent_id;
    
    -- Atualizar a primeira parcela para referenciar a si mesma
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Criar parcelas futuras
    FOR i IN 2..p_installments LOOP
        installment_date := p_date + (i - 1) * INTERVAL '1 month';
        
        INSERT INTO expenses (
            amount, description, date, payment_method, card_id,
            category_id, cost_center_id, owner, organization_id, user_id,
            installment_info, parent_expense_id, status, split
        ) VALUES (
            installment_amount, p_description, installment_date, 'credit_card', p_card_id,
            p_category_id, p_cost_center_id, p_owner, p_organization_id, p_user_id,
            jsonb_build_object(
                'total_installments', p_installments,
                'current_installment', i,
                'installment_amount', installment_amount,
                'total_amount', p_amount
            ),
            parent_id,
            'pending',
            is_shared
        );
    END LOOP;
    
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_installments IS 'Cria parcelas automaticamente para compras no cartão (suporta despesas compartilhadas)';

