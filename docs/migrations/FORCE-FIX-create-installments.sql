-- ============================================
-- FORCE FIX: Recriar função create_installments
-- ============================================
-- Este script FORÇA a recriação da função, dropando TODAS as versões
-- Execute este script no SQL Editor do Supabase

-- 1. DROPAR TODAS AS VERSÕES POSSÍVEIS DA FUNÇÃO
DROP FUNCTION IF EXISTS create_installments(numeric, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_installments(decimal, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_installments(numeric, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_installments(decimal, integer, text, date, uuid, uuid, uuid, text, uuid, uuid, text, jsonb) CASCADE;

-- 2. VERIFICAR SE FOI DROPADA (deve retornar 0 linhas)
SELECT COUNT(*) as remaining_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

-- 3. RECRIAR A FUNÇÃO COM A CORREÇÃO
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
    -- Log de debug
    RAISE NOTICE '🔍 create_installments chamada com % parcelas, split_template: %', p_installments, p_split_template;
    
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
    
    RAISE NOTICE '✅ Primeira parcela criada: expense_id=%', parent_id;
    
    -- Atualizar a primeira parcela para referenciar a si mesma
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Se houver split_template, inserir splits para a primeira parcela
    -- ⚠️ CORREÇÃO CRÍTICA: Dividir o valor do split pelo número de parcelas
    IF p_split_template IS NOT NULL AND jsonb_array_length(p_split_template) > 0 THEN
        RAISE NOTICE '🔍 Processando % splits para primeira parcela', jsonb_array_length(p_split_template);
        
        FOR split_item IN SELECT jsonb_array_elements(p_split_template)
        LOOP
            DECLARE
                split_cost_center_id UUID;
                split_percentage NUMERIC;
                split_amount NUMERIC;
            BEGIN
                split_cost_center_id := (split_item->>'cost_center_id')::UUID;
                split_percentage := (split_item->>'percentage')::NUMERIC;
                split_amount := (split_item->>'amount')::NUMERIC / p_installments;
                
                RAISE NOTICE '  → Inserindo split: cost_center=%, percentage=%, amount=% (original: %, dividido por %)', 
                    split_cost_center_id, split_percentage, split_amount, 
                    (split_item->>'amount')::NUMERIC, p_installments;
                
                INSERT INTO expense_splits (
                    expense_id,
                    cost_center_id,
                    percentage,
                    amount
                ) VALUES (
                    parent_id,
                    split_cost_center_id,
                    split_percentage,
                    split_amount
                );
            END;
        END LOOP;
        
        RAISE NOTICE '✅ Splits da primeira parcela inseridos';
    END IF;
    
    -- Se for mais de 1 parcela, criar as parcelas futuras
    IF p_installments > 1 THEN
        RAISE NOTICE '🔍 Criando % parcelas futuras', p_installments - 1;
        
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
            
            RAISE NOTICE '✅ Parcela %/% criada: expense_id=%', i, p_installments, CURRVAL('expenses_id_seq');
            
            -- Se houver split_template, inserir splits para cada parcela
            IF p_split_template IS NOT NULL AND jsonb_array_length(p_split_template) > 0 THEN
                FOR split_item IN SELECT jsonb_array_elements(p_split_template)
                LOOP
                    DECLARE
                        split_cost_center_id UUID;
                        split_percentage NUMERIC;
                        split_amount NUMERIC;
                    BEGIN
                        split_cost_center_id := (split_item->>'cost_center_id')::UUID;
                        split_percentage := (split_item->>'percentage')::NUMERIC;
                        split_amount := (split_item->>'amount')::NUMERIC / p_installments;
                        
                        RAISE NOTICE '  → Inserindo split parcela %: cost_center=%, amount=%', 
                            i, split_cost_center_id, split_amount;
                        
                        INSERT INTO expense_splits (
                            expense_id,
                            cost_center_id,
                            percentage,
                            amount
                        ) VALUES (
                            CURRVAL('expenses_id_seq'),
                            split_cost_center_id,
                            split_percentage,
                            split_amount
                        );
                    END;
                END LOOP;
            END IF;
        END LOOP;
        
        RAISE NOTICE '✅ Todas as parcelas futuras criadas';
    END IF;
    
    RAISE NOTICE '🎉 create_installments concluída com sucesso! parent_id=%', parent_id;
    
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_installments IS '✅ FORCE FIX 2025-11-16: Cria despesas parceladas com splits corrigidos (todas as parcelas dividem o valor)';

-- 4. VERIFICAR SE FOI RECRIADA CORRETAMENTE
SELECT 
    p.proname AS function_name,
    d.description,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_description d ON d.objoid = p.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

-- 5. MENSAGEM FINAL
DO $$
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ FUNÇÃO create_installments RECRIADA COM SUCESSO!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '1. Verifique se o comentário menciona "FORCE FIX 2025-11-16"';
    RAISE NOTICE '2. Tente criar uma transação parcelada novamente';
    RAISE NOTICE '3. Observe os logs NOTICE acima durante a execução';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Para ver os logs em tempo real:';
    RAISE NOTICE '   - Abra o SQL Editor do Supabase';
    RAISE NOTICE '   - Execute: SELECT create_installments(...);';
    RAISE NOTICE '   - Os logs NOTICE aparecerão no resultado';
    RAISE NOTICE '';
END $$;

