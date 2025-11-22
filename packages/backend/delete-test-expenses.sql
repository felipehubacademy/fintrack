-- ============================================================================
-- SQL PARA DELETAR DESPESAS DE TESTE - FINTRACK
-- ============================================================================
-- Usuario: Felipe Xavier
-- Organization: Família Xavier
-- Data dos testes: 15-20 de Novembro de 2024
-- ============================================================================

-- PASSO 1: PREVIEW - Ver o que será deletado (EXECUTAR PRIMEIRO!)
-- ============================================================================

SELECT 
    id,
    amount,
    description,
    category,
    payment_method,
    owner,
    date,
    created_at,
    source
FROM expenses
WHERE 
    user_id = '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'
    AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
    AND (
        -- Despesas de teste por descrição
        description ILIKE '%perfume%'
        OR description ILIKE '%torradeira%'
        OR description ILIKE '%sacolão%'
        OR description ILIKE '%sacolao%'
        OR description ILIKE '%material eletrico%'
        OR description ILIKE '%material elétrico%'
        OR description ILIKE '%impostos%'
        OR description ILIKE '%mercado%' -- cuidado, pode pegar despesas reais!
        OR description ILIKE '%supermercado%'
        OR description ILIKE '%carne%'
        
        -- OU valores específicos dos testes
        OR amount IN (250.00, 254.83, 139.00, 50.00, 106.17, 11.79, 1179.00, 95.64, 150.00)
        
        -- OU despesas criadas hoje (dia dos testes)
        OR DATE(created_at) = '2024-11-20'
        OR DATE(created_at) = '2024-11-19'
        OR DATE(created_at) = '2024-11-15'
    )
ORDER BY created_at DESC;

-- ============================================================================
-- PASSO 2: CONTAGEM - Verificar quantas serão deletadas
-- ============================================================================

SELECT COUNT(*) as total_despesas_teste
FROM expenses
WHERE 
    user_id = '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'
    AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
    AND (
        description ILIKE '%perfume%'
        OR description ILIKE '%torradeira%'
        OR description ILIKE '%sacolão%'
        OR description ILIKE '%sacolao%'
        OR description ILIKE '%material eletrico%'
        OR description ILIKE '%material elétrico%'
        OR description ILIKE '%impostos%'
        OR description ILIKE '%mercado%'
        OR description ILIKE '%supermercado%'
        OR description ILIKE '%carne%'
        OR amount IN (250.00, 254.83, 139.00, 50.00, 106.17, 11.79, 1179.00, 95.64, 150.00)
        OR DATE(created_at) = '2024-11-20'
        OR DATE(created_at) = '2024-11-19'
        OR DATE(created_at) = '2024-11-15'
    );

-- ============================================================================
-- PASSO 3: DELETE - EXECUTAR APENAS APÓS REVISAR O PREVIEW!
-- ============================================================================

-- ⚠️ CUIDADO: Esta query é IRREVERSÍVEL!
-- ⚠️ EXECUTE APENAS APÓS VERIFICAR O PREVIEW DO PASSO 1!

DELETE FROM expenses
WHERE 
    user_id = '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'
    AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
    AND (
        description ILIKE '%perfume%'
        OR description ILIKE '%torradeira%'
        OR description ILIKE '%sacolão%'
        OR description ILIKE '%sacolao%'
        OR description ILIKE '%material eletrico%'
        OR description ILIKE '%material elétrico%'
        OR description ILIKE '%impostos%'
        OR description ILIKE '%mercado%'
        OR description ILIKE '%supermercado%'
        OR description ILIKE '%carne%'
        OR amount IN (250.00, 254.83, 139.00, 50.00, 106.17, 11.79, 1179.00, 95.64, 150.00)
        OR DATE(created_at) = '2024-11-20'
        OR DATE(created_at) = '2024-11-19'
        OR DATE(created_at) = '2024-11-15'
    );

-- ============================================================================
-- ALTERNATIVA: DELETE MAIS CONSERVADOR (apenas despesas dos últimos 3 dias)
-- ============================================================================

-- Esta query é mais segura pois só deleta despesas muito recentes

DELETE FROM expenses
WHERE 
    user_id = '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'
    AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
    AND source = 'whatsapp' -- Apenas despesas via WhatsApp
    AND created_at >= NOW() - INTERVAL '3 days'; -- Apenas últimos 3 dias

-- ============================================================================
-- ALTERNATIVA: DELETE POR ID (mais seguro - copie os IDs do PASSO 1)
-- ============================================================================

-- Copie os IDs que apareceram no PASSO 1 e cole aqui:

DELETE FROM expenses
WHERE id IN (
    -- Cole aqui os IDs que você quer deletar, separados por vírgula:
    -- Exemplo: 694, 695, 1414, 1476, 1807, etc
);

-- ============================================================================
-- LIMPEZA ADICIONAL: Limpar estados de conversa
-- ============================================================================

-- Opcional: Limpar estados de conversa do WhatsApp
DELETE FROM conversation_state
WHERE user_phone IN (
    '+5511978229898',  -- Felipe Xavier
    '+5511888999000',  -- Telefone de teste 1
    '+5511888999001',  -- Telefone de teste 2
    '+5511888999002',  -- Telefone de teste 3
    '+5511888999003'   -- Telefone de teste 4
);

-- ============================================================================
-- VERIFICAÇÃO FINAL: Conferir se deletou corretamente
-- ============================================================================

SELECT 
    DATE(created_at) as dia,
    COUNT(*) as total_despesas,
    SUM(amount) as total_valor
FROM expenses
WHERE 
    user_id = '7ae77718-a4a2-4a3c-8f99-e537f2c5ff92'
    AND organization_id = '9fad4881-65a9-4e38-ad75-b707ddff473f'
GROUP BY DATE(created_at)
ORDER BY dia DESC
LIMIT 10;

