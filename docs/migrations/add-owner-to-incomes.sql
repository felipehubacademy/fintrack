-- ============================================
-- ADICIONAR CAMPO 'owner' NA TABELA INCOMES
-- ============================================
-- 
-- Esta migração adiciona o campo 'owner' (nome do responsável) na tabela incomes
-- para manter consistência com a tabela expenses e facilitar a exibição e consultas.
--
-- O campo 'owner' armazenará:
-- - Nome do cost center quando for entrada individual (ex: "Felipe", "Maria")
-- - Nome da organização quando for entrada compartilhada (ex: "Família", "Casa")
--
-- Data: 2025-11-05
-- ============================================

-- 1. Adicionar coluna 'owner' na tabela incomes
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS owner TEXT;

-- 2. Atualizar registros existentes com base no cost_center_id ou organização
DO $$
DECLARE
    rec RECORD;
    org_name TEXT;
    cost_center_name TEXT;
BEGIN
    -- Para cada income existente
    FOR rec IN SELECT i.id, i.cost_center_id, i.organization_id, i.is_shared 
               FROM incomes i 
               WHERE i.owner IS NULL
    LOOP
        IF rec.is_shared THEN
            -- Se for compartilhado, buscar nome da organização
            SELECT o.name INTO org_name
            FROM organizations o
            WHERE o.id = rec.organization_id;
            
            UPDATE incomes 
            SET owner = COALESCE(org_name, 'Compartilhado')
            WHERE id = rec.id;
        ELSE
            -- Se for individual, buscar nome do cost center
            SELECT cc.name INTO cost_center_name
            FROM cost_centers cc
            WHERE cc.id = rec.cost_center_id;
            
            IF cost_center_name IS NOT NULL THEN
                UPDATE incomes 
                SET owner = cost_center_name
                WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 3. Adicionar comentário na coluna
COMMENT ON COLUMN incomes.owner IS 'Nome do responsável pela entrada (cost center individual ou nome da organização quando compartilhado)';

-- 4. Verificar se a coluna foi adicionada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'incomes' 
AND column_name = 'owner';

