-- ============================================
-- TESTE: Verificar qual versão da função está ativa
-- ============================================

-- 1. Ver o comentário da função (deve mostrar FINAL FIX se foi atualizada)
SELECT 
    p.proname AS function_name,
    d.description AS comment,
    pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_description d ON d.objoid = p.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

-- 2. Ver o código fonte da função (procure por "FOR split_idx IN" para confirmar a correção)
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_installments'
AND n.nspname = 'public';

-- 3. Teste direto com dados de exemplo
-- ⚠️ ATENÇÃO: Este teste vai criar dados reais no banco!
-- Só execute se quiser testar diretamente
/*
DO $$
DECLARE
    test_parent_id BIGINT;
    test_card_id UUID;
    test_category_id UUID;
    test_org_id UUID;
    test_user_id UUID;
BEGIN
    -- Pegar IDs reais do seu banco
    SELECT id INTO test_card_id FROM cards LIMIT 1;
    SELECT id INTO test_category_id FROM budget_categories LIMIT 1;
    SELECT id INTO test_org_id FROM organizations LIMIT 1;
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    RAISE NOTICE '🧪 Testando create_installments com splits...';
    
    -- Chamar a função com 2 splits
    test_parent_id := create_installments(
        p_amount := 100.00,
        p_installments := 1,
        p_description := 'TESTE - PODE DELETAR',
        p_date := CURRENT_DATE,
        p_card_id := test_card_id,
        p_category_id := test_category_id,
        p_cost_center_id := NULL,
        p_owner := 'Compartilhado',
        p_organization_id := test_org_id,
        p_user_id := test_user_id,
        p_whatsapp_message_id := NULL,
        p_split_template := '[
            {"cost_center_id": "6b44926c-1b79-4cac-9a82-9f0bc7f15c9e", "percentage": 50, "amount": 50},
            {"cost_center_id": "2c7436af-9ff6-4811-b401-94e0648c4d59", "percentage": 50, "amount": 50}
        ]'::jsonb
    );
    
    RAISE NOTICE '✅ Teste concluído! parent_id=%', test_parent_id;
    
    -- Verificar quantos splits foram inseridos
    RAISE NOTICE '📊 Splits inseridos: %', (
        SELECT COUNT(*) 
        FROM expense_splits 
        WHERE expense_id = test_parent_id
    );
    
    -- Limpar teste (opcional - comente se quiser ver os dados)
    DELETE FROM expense_splits WHERE expense_id = test_parent_id;
    DELETE FROM expenses WHERE id = test_parent_id;
    
    RAISE NOTICE '🧹 Dados de teste removidos';
END $$;
*/

