-- Adicionar políticas RLS para tabela cards
-- ============================================

-- Habilitar RLS na tabela cards
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver cartões da sua organização
CREATE POLICY "Users can view cards from their organization" ON cards
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Política para INSERT: usuários podem criar cartões na sua organização
CREATE POLICY "Users can insert cards in their organization" ON cards
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Política para UPDATE: usuários podem editar cartões da sua organização
CREATE POLICY "Users can update cards in their organization" ON cards
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Política para DELETE: usuários podem deletar cartões da sua organização
CREATE POLICY "Users can delete cards in their organization" ON cards
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

