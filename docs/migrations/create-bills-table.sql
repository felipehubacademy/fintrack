-- ============================================================================
-- MIGRATION: Create Bills Table (Contas a Pagar)
-- Description: Tabela para gerenciar contas a pagar com suporte a recorrência
-- Date: 2025-10-23
-- Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Criar tabela bills
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos da conta
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    
    -- Categorização
    category_id UUID REFERENCES budget_categories(id),
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Recorrência
    is_recurring BOOLEAN DEFAULT false,
    recurrence_frequency TEXT CHECK (recurrence_frequency IN ('monthly', 'weekly', 'yearly')),
    
    -- Status e pagamento
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other')),
    
    -- Referências
    card_id UUID REFERENCES cards(id),
    expense_id BIGINT REFERENCES expenses(id), -- Referência para expense criada ao pagar
    
    -- Notificações
    notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Organização e usuário
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bills_organization ON bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_recurring ON bills(is_recurring) WHERE is_recurring = true;

-- 3. Adicionar comentários
-- ============================================================================
COMMENT ON TABLE bills IS 'Contas a pagar com suporte a recorrência e notificações';
COMMENT ON COLUMN bills.is_recurring IS 'Se true, gera nova conta automaticamente após pagamento';
COMMENT ON COLUMN bills.recurrence_frequency IS 'Frequência de recorrência (monthly, weekly, yearly)';
COMMENT ON COLUMN bills.status IS 'Status da conta: pending, paid, overdue, cancelled';
COMMENT ON COLUMN bills.expense_id IS 'ID da expense criada ao marcar como paga';
COMMENT ON COLUMN bills.notified_at IS 'Data/hora da última notificação enviada';

-- 4. Criar função para atualizar status overdue automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_bills_overdue_status()
RETURNS void AS $$
BEGIN
    UPDATE bills
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para gerar conta recorrente
-- ============================================================================
CREATE OR REPLACE FUNCTION create_recurring_bill(bill_id UUID)
RETURNS UUID AS $$
DECLARE
    original_bill bills%ROWTYPE;
    new_due_date DATE;
    new_bill_id UUID;
BEGIN
    -- Buscar conta original
    SELECT * INTO original_bill FROM bills WHERE id = bill_id;
    
    IF NOT original_bill.is_recurring THEN
        RAISE EXCEPTION 'Conta não é recorrente';
    END IF;
    
    -- Calcular próxima data de vencimento
    CASE original_bill.recurrence_frequency
        WHEN 'monthly' THEN
            new_due_date := original_bill.due_date + INTERVAL '1 month';
        WHEN 'weekly' THEN
            new_due_date := original_bill.due_date + INTERVAL '1 week';
        WHEN 'yearly' THEN
            new_due_date := original_bill.due_date + INTERVAL '1 year';
        ELSE
            RAISE EXCEPTION 'Frequência de recorrência inválida';
    END CASE;
    
    -- Criar nova conta
    INSERT INTO bills (
        description,
        amount,
        due_date,
        category_id,
        cost_center_id,
        is_recurring,
        recurrence_frequency,
        status,
        organization_id,
        user_id
    ) VALUES (
        original_bill.description,
        original_bill.amount,
        new_due_date,
        original_bill.category_id,
        original_bill.cost_center_id,
        original_bill.is_recurring,
        original_bill.recurrence_frequency,
        'pending',
        original_bill.organization_id,
        original_bill.user_id
    ) RETURNING id INTO new_bill_id;
    
    RETURN new_bill_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Verificar criação
-- ============================================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bills'
ORDER BY ordinal_position;

COMMENT ON TABLE bills IS 'Migration completed: create-bills-table.sql';

