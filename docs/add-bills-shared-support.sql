-- ============================================
-- ADICIONAR SUPORTE A COMPARTILHADO EM BILLS
-- ============================================
-- Adiciona campo is_shared e lógica de divisão para contas a pagar

-- 1. Adicionar campo is_shared na tabela bills
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- 2. Adicionar comentário
COMMENT ON COLUMN bills.is_shared IS 'Se true, conta é compartilhada entre todos os responsáveis financeiros';

-- 3. Criar tabela bill_splits para divisão de contas compartilhadas
CREATE TABLE IF NOT EXISTS bill_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    cost_center_id UUID NOT NULL REFERENCES cost_centers(id) ON DELETE CASCADE,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bill_id, cost_center_id)
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_bill_splits_bill_id ON bill_splits(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_cost_center_id ON bill_splits(cost_center_id);

-- 5. Adicionar comentários
COMMENT ON TABLE bill_splits IS 'Divisão de contas compartilhadas entre centros de custo';
COMMENT ON COLUMN bill_splits.percentage IS 'Percentual da conta para este centro (soma deve ser 100%)';
COMMENT ON COLUMN bill_splits.amount IS 'Valor da conta para este centro (calculado automaticamente)';

-- 6. Criar função para calcular divisão automática de contas compartilhadas
CREATE OR REPLACE FUNCTION create_bill_splits()
RETURNS TRIGGER AS $$
DECLARE
    cost_center_record RECORD;
    total_percentage DECIMAL(5,2) := 0;
    split_amount DECIMAL(10,2);
BEGIN
    -- Só processar se for conta compartilhada
    IF NOT NEW.is_shared THEN
        RETURN NEW;
    END IF;
    
    -- Limpar splits existentes para esta conta
    DELETE FROM bill_splits WHERE bill_id = NEW.id;
    
    -- Buscar todos os centros de custo ativos da organização
    FOR cost_center_record IN 
        SELECT id, default_split_percentage, name
        FROM cost_centers 
        WHERE organization_id = NEW.organization_id 
        AND is_active = true
        AND default_split_percentage > 0
    LOOP
        -- Calcular valor da divisão
        split_amount := (NEW.amount * cost_center_record.default_split_percentage) / 100;
        
        -- Inserir split
        INSERT INTO bill_splits (bill_id, cost_center_id, percentage, amount)
        VALUES (NEW.id, cost_center_record.id, cost_center_record.default_split_percentage, split_amount);
        
        -- Somar percentual total
        total_percentage := total_percentage + cost_center_record.default_split_percentage;
    END LOOP;
    
    -- Verificar se a soma dos percentuais é 100%
    IF total_percentage != 100.00 THEN
        RAISE WARNING 'Soma dos percentuais de divisão da conta % é %%, deveria ser 100%%', NEW.id, total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para divisão automática
DROP TRIGGER IF EXISTS trigger_create_bill_splits ON bills;
CREATE TRIGGER trigger_create_bill_splits
    AFTER INSERT OR UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION create_bill_splits();

-- 8. Atualizar contas existentes que podem ser compartilhadas
-- (Esta parte é opcional - apenas se quiser marcar contas existentes como compartilhadas)
-- UPDATE bills SET is_shared = true WHERE cost_center_id IS NULL;

-- 9. Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bills' 
AND table_schema = 'public'
AND column_name IN ('is_shared')
ORDER BY ordinal_position;

-- 10. Verificar se a tabela bill_splits foi criada
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'bill_splits' 
AND table_schema = 'public'
ORDER BY ordinal_position;
