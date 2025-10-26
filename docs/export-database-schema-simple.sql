-- ============================================
-- EXPORTAR SCHEMA DO BANCO - VERSÃO SIMPLIFICADA
-- ============================================
-- ATENÇÃO: Este SQL é leve, mas mesmo assim use com cautela
-- O SQL complexo (export-database-schema.sql) foi removido pois causava timeout

-- ============================================
-- 1. LISTAR TODAS AS TABELAS
-- ============================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

