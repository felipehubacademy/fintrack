-- ============================================
-- VERIFICAR: O que acontece quando inserimos um split
-- ============================================

-- Ativar log detalhado
SET client_min_messages TO NOTICE;

-- Teste com transação para poder fazer ROLLBACK
BEGIN;

DO $$
DECLARE
    test_expense_id BIGINT;
    test_parent_id BIGINT;
BEGIN
    RAISE NOTICE '🧪 TESTE: Simular exatamente o que o modal faz';
    RAISE NOTICE '';
    
    -- Chamar create_installments com os mesmos parâmetros do modal
    RAISE NOTICE '📞 Chamando create_installments...';
    test_parent_id := create_installments(
        p_amount := 100.00,
        p_installments := 1,
        p_description := 'TESTE MODAL',
        p_date := CURRENT_DATE,
        p_card_id := 'cb9904fe-23a5-4f4a-bd2f-7a4d82f6801b'::uuid,
        p_category_id := NULL,
        p_cost_center_id := NULL,  -- ← NULL porque é compartilhado
        p_owner := 'Compartilhado',
        p_organization_id := '9fad4881-65a9-4e38-ad75-b707ddff473f'::uuid,
        p_user_id := '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'::uuid,
        p_whatsapp_message_id := NULL,
        p_split_template := '[
            {"cost_center_id": "6b44926c-1b79-4cac-9a82-9f0bc7f15c9e", "percentage": 50, "amount": 50},
            {"cost_center_id": "2c7436af-9ff6-4811-b401-94e0648c4d59", "percentage": 50, "amount": 50}
        ]'::jsonb
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ create_installments retornou: %', test_parent_id;
    RAISE NOTICE '';
    
    -- Verificar quantos splits foram inseridos
    RAISE NOTICE '📊 Verificando splits inseridos...';
    FOR rec IN 
        SELECT expense_id, cost_center_id, percentage, amount
        FROM expense_splits
        WHERE expense_id = test_parent_id
        ORDER BY cost_center_id
    LOOP
        RAISE NOTICE '  - expense_id=%, cost_center=%, percentage=%, amount=%',
            rec.expense_id, rec.cost_center_id, rec.percentage, rec.amount;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total de splits: %', (
        SELECT COUNT(*) FROM expense_splits WHERE expense_id = test_parent_id
    );
    
END $$;

-- ROLLBACK para não salvar os dados de teste
ROLLBACK;

RAISE NOTICE '';
RAISE NOTICE '🔄 ROLLBACK executado - nenhum dado foi salvo';

