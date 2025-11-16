-- ============================================
-- DEBUG: Testar inserção ÚNICA e DIRETA de split
-- ============================================
-- Vamos inserir UM split manualmente para ver se duplica

DO $$
DECLARE
    test_expense_id BIGINT;
    splits_before INTEGER;
    splits_after INTEGER;
BEGIN
    RAISE NOTICE '🧪 Teste: Inserir UM expense e UM split manualmente';
    
    -- Criar uma expense de teste
    INSERT INTO expenses (
        amount, description, date, payment_method,
        organization_id, user_id, status, confirmed_at, confirmed_by, source
    ) VALUES (
        100.00, 'TESTE MANUAL - PODE DELETAR', CURRENT_DATE, 'cash',
        '9fad4881-65a9-4e38-ad75-b707ddff473f'::uuid,
        '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'::uuid,
        'confirmed', NOW(), '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'::uuid, 'manual'
    ) RETURNING id INTO test_expense_id;
    
    RAISE NOTICE '✅ Expense criada: id=%', test_expense_id;
    
    -- Contar splits ANTES da inserção
    SELECT COUNT(*) INTO splits_before 
    FROM expense_splits 
    WHERE expense_id = test_expense_id;
    
    RAISE NOTICE '📊 Splits ANTES da inserção: %', splits_before;
    
    -- Inserir UM split
    RAISE NOTICE '🔍 Inserindo UM split...';
    INSERT INTO expense_splits (
        expense_id,
        cost_center_id,
        percentage,
        amount
    ) VALUES (
        test_expense_id,
        '6b44926c-1b79-4cac-9a82-9f0bc7f15c9e'::uuid,
        50,
        50.00
    );
    
    RAISE NOTICE '✅ Split inserido';
    
    -- Contar splits DEPOIS da inserção
    SELECT COUNT(*) INTO splits_after 
    FROM expense_splits 
    WHERE expense_id = test_expense_id;
    
    RAISE NOTICE '📊 Splits DEPOIS da inserção: %', splits_after;
    
    -- Verificar resultado
    IF splits_after = 1 THEN
        RAISE NOTICE '✅ CORRETO! Apenas 1 split inserido';
    ELSIF splits_after = 2 THEN
        RAISE NOTICE '❌ DUPLICAÇÃO! 2 splits inseridos (deveria ser 1)';
        RAISE NOTICE '⚠️ HÁ UM TRIGGER OU RULE DUPLICANDO AS INSERÇÕES!';
    ELSE
        RAISE NOTICE '⚠️ ATENÇÃO! % splits inseridos (esperado: 1)', splits_after;
    END IF;
    
    -- Limpar
    RAISE NOTICE '🧹 Removendo dados de teste...';
    DELETE FROM expense_splits WHERE expense_id = test_expense_id;
    DELETE FROM expenses WHERE id = test_expense_id;
    RAISE NOTICE '✅ Limpeza concluída';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO: % - %', SQLERRM, SQLSTATE;
    -- Tentar limpar mesmo com erro
    IF test_expense_id IS NOT NULL THEN
        DELETE FROM expense_splits WHERE expense_id = test_expense_id;
        DELETE FROM expenses WHERE id = test_expense_id;
    END IF;
    RAISE;
END $$;

