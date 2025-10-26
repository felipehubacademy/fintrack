-- ============================================
-- VER COLUNAS DE UMA TABELA ESPECÍFICA
-- ============================================
-- Substitua 'NOME_DA_TABELA' pela tabela que deseja ver

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'NOME_DA_TABELA'  -- ← Mude aqui
ORDER BY ordinal_position;

