-- ============================================
-- TESTE DIRETO: Executar create_installments com seus dados reais
-- ============================================

DO $$
DECLARE
    test_parent_id BIGINT;
    split_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 Testando create_installments com seus dados exatos...';
    
    -- Usar exatamente os mesmos dados que o frontend está enviando
    test_parent_id := create_installments(
        p_amount := 100.00,
        p_installments := 1,
        p_description := 'TESTE DIRETO - PODE DELETAR',
        p_date := CURRENT_DATE,
        p_card_id := 'cb9904fe-23a5-4f4a-bd2f-7a4d82f6801b'::uuid,
        p_category_id := NULL,
        p_cost_center_id := NULL,
        p_owner := 'Compartilhado',
        p_organization_id := '9fad4881-65a9-4e38-ad75-b707ddff473f'::uuid,
        p_user_id := '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'::uuid,
        p_whatsapp_message_id := NULL,
        p_split_template := '[
            {"cost_center_id": "6b44926c-1b79-4cac-9a82-9f0bc7f15c9e", "percentage": 50, "amount": 50},
            {"cost_center_id": "2c7436af-9ff6-4811-b401-94e0648c4d59", "percentage": 50, "amount": 50}
        ]'::jsonb
    );
    
    RAISE NOTICE '✅ Teste concluído! parent_id=%', test_parent_id;
    
    -- Verificar quantos splits foram inseridos
    SELECT COUNT(*) INTO split_count FROM expense_splits WHERE expense_id = test_parent_id;
    RAISE NOTICE '📊 Splits inseridos: %', split_count;
    
    IF split_count = 2 THEN
        RAISE NOTICE '✅ SUCESSO! Exatamente 2 splits inseridos (correto)';
    ELSIF split_count = 4 THEN
        RAISE NOTICE '❌ ERRO! 4 splits inseridos (duplicação detectada)';
    ELSE
        RAISE NOTICE '⚠️ ATENÇÃO! % splits inseridos (esperado: 2)', split_count;
    END IF;
    
    -- ⚠️ IMPORTANTE: Limpar os dados de teste
    RAISE NOTICE '🧹 Removendo dados de teste...';
    DELETE FROM expense_splits WHERE expense_id = test_parent_id;
    DELETE FROM expenses WHERE id = test_parent_id;
    RAISE NOTICE '✅ Dados de teste removidos';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO: % - %', SQLERRM, SQLSTATE;
    RAISE;
END $$;
