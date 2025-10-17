-- ============================================
-- FINTRACK V2 - SCHEMA FINAL OTIMIZADO
-- ============================================

-- 0. LIMPEZA DE TABELAS OBSOLETAS V1
-- ============================================

-- Remover views que dependem das tabelas obsoletas
DROP VIEW IF EXISTS expenses_cards CASCADE;
DROP VIEW IF EXISTS expenses_cashlike CASCADE;

-- Remover tabelas obsoletas V1
DROP TABLE IF EXISTS expenses_general CASCADE;
DROP TABLE IF EXISTS expenses_cards CASCADE;

-- 1. TABELA UNIFICADA DE EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos da despesa
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- PARCELAMENTO (apenas para cartão de crédito)
    installment_info JSONB, -- { total_installments: 3, current_installment: 1, installment_amount: 166.67 }
    parent_expense_id UUID REFERENCES expenses(id), -- Para agrupar parcelas da mesma compra
    
    -- Categorização
    category TEXT,
    category_id UUID REFERENCES budget_categories(id),
    
    -- Responsável
    owner TEXT,
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Método de pagamento (define destino no frontend)
    payment_method TEXT NOT NULL CHECK (payment_method IN (
        'credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'
    )),
    
    -- Para cartões - referência específica
    card_id UUID REFERENCES cards(id),
    
    -- Status
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_by UUID REFERENCES users(id),
    
    -- Origem
    source TEXT DEFAULT 'manual' CHECK (source IN ('whatsapp', 'manual', 'import')),
    whatsapp_message_id TEXT,
    conversation_state JSONB,
    
    -- Organização
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE CARDS (melhorada)
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos
    name TEXT NOT NULL, -- "Nubank Roxinho", "Itaú Visa"
    bank TEXT, -- "Nubank", "Itaú"
    type TEXT DEFAULT 'credit' CHECK (type IN ('credit', 'debit', 'prepaid')),
    
    -- Identificação
    last_four_digits TEXT,
    holder_name TEXT,
    
    -- Ciclo de faturamento
    billing_day INTEGER NOT NULL CHECK (billing_day >= 1 AND billing_day <= 31),
    best_day INTEGER, -- Melhor dia para compras
    
    -- Limites
    credit_limit DECIMAL(12,2),
    available_limit DECIMAL(12,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    
    -- Responsável
    owner_id UUID REFERENCES users(id),
    
    -- Organização
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FUNÇÃO PARA CRIAR PARCELAS
-- ============================================
CREATE OR REPLACE FUNCTION create_installments(
    p_amount DECIMAL,
    p_installments INTEGER,
    p_description TEXT,
    p_date DATE,
    p_card_id UUID,
    p_category_id UUID,
    p_cost_center_id UUID,
    p_owner TEXT,
    p_organization_id UUID,
    p_user_id UUID,
    p_whatsapp_message_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    parent_id UUID;
    installment_amount DECIMAL(10,2);
    installment_date DATE;
    i INTEGER;
BEGIN
    -- Calcular valor da parcela
    installment_amount := ROUND(p_amount / p_installments, 2);
    
    -- Criar despesa "pai" (primeira parcela)
    INSERT INTO expenses (
        amount, description, date, payment_method, card_id,
        category_id, cost_center_id, owner, organization_id, user_id,
        whatsapp_message_id, installment_info, parent_expense_id
    ) VALUES (
        installment_amount, p_description, p_date, 'credit_card', p_card_id,
        p_category_id, p_cost_center_id, p_owner, p_organization_id, p_user_id,
        p_whatsapp_message_id,
        jsonb_build_object(
            'total_installments', p_installments,
            'current_installment', 1,
            'installment_amount', installment_amount,
            'total_amount', p_amount
        ),
        NULL
    ) RETURNING id INTO parent_id;
    
    -- Atualizar a primeira parcela para referenciar a si mesma
    UPDATE expenses SET parent_expense_id = parent_id WHERE id = parent_id;
    
    -- Criar parcelas futuras
    FOR i IN 2..p_installments LOOP
        installment_date := p_date + (i - 1) * INTERVAL '1 month';
        
        INSERT INTO expenses (
            amount, description, date, payment_method, card_id,
            category_id, cost_center_id, owner, organization_id, user_id,
            installment_info, parent_expense_id, status
        ) VALUES (
            installment_amount, p_description, installment_date, 'credit_card', p_card_id,
            p_category_id, p_cost_center_id, p_owner, p_organization_id, p_user_id,
            jsonb_build_object(
                'total_installments', p_installments,
                'current_installment', i,
                'installment_amount', installment_amount,
                'total_amount', p_amount
            ),
            parent_id,
            'pending' -- Parcelas futuras ficam pendentes
        );
    END LOOP;
    
    RETURN parent_id;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNÇÃO PARA BUSCAR CICLO DE FATURAMENTO
-- ============================================
CREATE OR REPLACE FUNCTION get_billing_cycle(card_uuid UUID, reference_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
DECLARE
    billing_day INTEGER;
    start_date DATE;
    end_date DATE;
BEGIN
    SELECT cards.billing_day INTO billing_day
    FROM cards WHERE cards.id = card_uuid;
    
    IF billing_day IS NULL THEN
        RAISE EXCEPTION 'Cartão não encontrado';
    END IF;
    
    -- Calcular ciclo
    start_date := DATE_TRUNC('month', reference_date) + (billing_day - 1) * INTERVAL '1 day';
    
    IF billing_day > EXTRACT(DAY FROM reference_date) THEN
        start_date := start_date - INTERVAL '1 month';
    END IF;
    
    end_date := start_date + INTERVAL '1 month' - INTERVAL '1 day';
    
    RETURN QUERY SELECT start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- 5. VIEW PARA FACILITAR QUERIES DO FRONTEND (movida para depois dos índices)

-- 6. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_card_id ON expenses(card_id);
CREATE INDEX IF NOT EXISTS idx_expenses_parent_id ON expenses(parent_expense_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- 7. RLS POLICIES
-- ============================================
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Políticas para expenses
CREATE POLICY "Users can view expenses from their organization" ON expenses
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert expenses to their organization" ON expenses
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Políticas para cards
CREATE POLICY "Users can view cards from their organization" ON cards
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage cards from their organization" ON cards
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- 7. VIEW PARA FACILITAR QUERIES DO FRONTEND
-- ============================================
CREATE OR REPLACE VIEW expenses_with_details AS
SELECT 
    e.*,
    c.name as card_name,
    c.billing_day,
    cc.name as cost_center_name,
    bc.name as category_name,
    CASE 
        WHEN e.installment_info IS NOT NULL THEN
            CONCAT(e.description, ' (', 
                   (e.installment_info->>'current_installment'), '/', 
                   (e.installment_info->>'total_installments'), ')')
        ELSE e.description
    END as display_description
FROM expenses e
LEFT JOIN cards c ON e.card_id = c.id
LEFT JOIN cost_centers cc ON e.cost_center_id = cc.id
LEFT JOIN budget_categories bc ON e.category_id = bc.id;

-- 8. FUNÇÃO DE MIGRAÇÃO SEGURA
-- ============================================
CREATE OR REPLACE FUNCTION migrate_v1_to_v2()
RETURNS TEXT AS $$
DECLARE
    migrated_general INTEGER := 0;
    migrated_cards INTEGER := 0;
    error_message TEXT;
BEGIN
    -- Migrar expenses_general para expenses (se existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_general') THEN
        INSERT INTO expenses (
            id, amount, description, date, category, owner, payment_method,
            status, confirmed_at, organization_id, user_id, created_at, source
        )
        SELECT 
            id, amount, description, date, category, owner,
            CASE 
                WHEN payment_method = 'credit_card' THEN 'credit_card'
                WHEN payment_method = 'cash' THEN 'cash'
                ELSE 'other'
            END,
            COALESCE(status, 'confirmed'), confirmed_at, 
            (SELECT organization_id FROM users LIMIT 1), -- Primeira organização
            (SELECT id FROM users LIMIT 1), -- Primeiro usuário
            created_at, 'manual'
        FROM expenses_general
        WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expenses_general.id);
        
        GET DIAGNOSTICS migrated_general = ROW_COUNT;
    END IF;
    
    -- Migrar expenses_cards para expenses (se existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_cards') THEN
        INSERT INTO expenses (
            id, amount, description, date, category, owner, payment_method,
            status, confirmed_at, organization_id, user_id, created_at, source
        )
        SELECT 
            id, amount, description, date, category, owner, 'credit_card',
            COALESCE(status, 'confirmed'), confirmed_at,
            (SELECT organization_id FROM users LIMIT 1), -- Primeira organização
            (SELECT id FROM users LIMIT 1), -- Primeiro usuário
            created_at, 'manual'
        FROM expenses_cards
        WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE expenses.id = expenses_cards.id);
        
        GET DIAGNOSTICS migrated_cards = ROW_COUNT;
    END IF;
    
    RETURN FORMAT('Migração concluída: %s de expenses_general, %s de expenses_cards', 
                  migrated_general, migrated_cards);
                  
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    RETURN FORMAT('Erro na migração: %s', error_message);
END;
$$ LANGUAGE plpgsql;

-- 9. SCRIPT DE MIGRAÇÃO COMPLETO
-- ============================================
-- Para executar a migração completa:
-- 
-- 1. Fazer backup dos dados:
--    CREATE TABLE expenses_general_backup AS SELECT * FROM expenses_general;
--    CREATE TABLE expenses_cards_backup AS SELECT * FROM expenses_cards;
--
-- 2. Executar migração:
--    SELECT migrate_v1_to_v2();
--
-- 3. Verificar resultados:
--    SELECT COUNT(*) FROM expenses;
--    SELECT payment_method, COUNT(*) FROM expenses GROUP BY payment_method;
--
-- 4. Se tudo OK, remover tabelas obsoletas:
--    DROP TABLE IF EXISTS expenses_general CASCADE;
--    DROP TABLE IF EXISTS expenses_cards CASCADE;

-- 10. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE expenses IS 'Tabela unificada para todas as despesas com suporte a parcelamento';
COMMENT ON COLUMN expenses.installment_info IS 'Informações de parcelamento: {total_installments, current_installment, installment_amount, total_amount}';
COMMENT ON COLUMN expenses.parent_expense_id IS 'ID da primeira parcela para agrupar parcelas da mesma compra';
COMMENT ON FUNCTION create_installments IS 'Cria parcelas automaticamente para compras no cartão';
COMMENT ON FUNCTION migrate_v1_to_v2 IS 'Migra dados das tabelas V1 para a estrutura V2 unificada';
