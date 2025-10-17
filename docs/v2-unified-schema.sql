-- ============================================
-- FINTRACK V2 - SCHEMA UNIFICADO E MELHORADO
-- ============================================

-- 1. Tabela UNIFICADA de expenses (remover expenses_general e expenses_cards)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados básicos da despesa
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Categorização
    category TEXT, -- Nome da categoria (ex: "Alimentação")
    category_id UUID REFERENCES budget_categories(id),
    
    -- Responsável e centro de custo
    owner TEXT, -- Nome do responsável (ex: "Felipe", "Compartilhado")
    cost_center_id UUID REFERENCES cost_centers(id),
    
    -- Método de pagamento (define se vai para /cards ou /finance)
    payment_method TEXT NOT NULL CHECK (payment_method IN (
        'credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'
    )),
    
    -- Para cartões de crédito - referência ao cartão específico
    card_id UUID REFERENCES cards(id), -- NULL para métodos não-cartão
    
    -- Status e confirmação
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES users(id),
    
    -- Origem da despesa
    source TEXT DEFAULT 'manual' CHECK (source IN ('whatsapp', 'manual', 'import')),
    whatsapp_message_id TEXT,
    
    -- Dados de conversação (WhatsApp)
    conversation_state JSONB,
    
    -- Organização e usuário
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Nova tabela CARDS para gerenciar cartões por organização
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados do cartão
    name TEXT NOT NULL, -- ex: "Nubank Roxinho", "Itaú Visa"
    bank TEXT, -- ex: "Nubank", "Itaú", "Santander"
    type TEXT DEFAULT 'credit' CHECK (type IN ('credit', 'debit', 'prepaid')),
    
    -- Números e identificação
    last_four_digits TEXT, -- ex: "1234"
    holder_name TEXT, -- Nome do portador
    
    -- Ciclo de faturamento
    billing_day INTEGER NOT NULL CHECK (billing_day >= 1 AND billing_day <= 31), -- Dia do vencimento
    best_day INTEGER, -- Melhor dia para compras (opcional)
    
    -- Datas importantes
    due_date DATE, -- Data de vencimento da fatura atual
    next_billing_date DATE, -- Próxima data de fechamento
    
    -- Limites
    credit_limit DECIMAL(12,2), -- Limite do cartão
    available_limit DECIMAL(12,2), -- Limite disponível
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false, -- Cartão principal da organização
    
    -- Responsável pelo cartão
    owner_id UUID REFERENCES users(id), -- Quem usa este cartão
    
    -- Organização
    organization_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Atualizar cost_centers para suportar cartões
-- ============================================
ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS default_card_id UUID REFERENCES cards(id);

-- 4. Índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_expenses_card_id ON expenses(card_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

CREATE INDEX IF NOT EXISTS idx_cards_organization_id ON cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_cards_owner_id ON cards(owner_id);
CREATE INDEX IF NOT EXISTS idx_cards_is_active ON cards(is_active);

-- 5. RLS Policies (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Política para expenses: usuários só veem expenses da sua organização
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

CREATE POLICY "Users can update expenses from their organization" ON expenses
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Política para cards: usuários só veem cards da sua organização
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

-- 6. Funções auxiliares
-- ============================================

-- Função para obter ciclo de faturamento de um cartão
CREATE OR REPLACE FUNCTION get_billing_cycle(card_uuid UUID, reference_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(start_date DATE, end_date DATE) AS $$
DECLARE
    billing_day INTEGER;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Buscar dia de faturamento do cartão
    SELECT cards.billing_day INTO billing_day
    FROM cards
    WHERE cards.id = card_uuid;
    
    IF billing_day IS NULL THEN
        RAISE EXCEPTION 'Cartão não encontrado';
    END IF;
    
    -- Calcular ciclo baseado no dia de faturamento
    start_date := DATE_TRUNC('month', reference_date) + (billing_day - 1) * INTERVAL '1 day';
    
    -- Se o dia de faturamento já passou no mês atual, o ciclo começou no mês anterior
    IF billing_day > EXTRACT(DAY FROM reference_date) THEN
        start_date := start_date - INTERVAL '1 month';
    END IF;
    
    -- Data de fim é um dia antes do próximo fechamento
    end_date := start_date + INTERVAL '1 month' - INTERVAL '1 day';
    
    RETURN QUERY SELECT start_date, end_date;
END;
$$ LANGUAGE plpgsql;

-- Função para migrar dados existentes
CREATE OR REPLACE FUNCTION migrate_to_unified_schema()
RETURNS TEXT AS $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Migrar expenses_general para expenses (se existir)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses_general') THEN
        INSERT INTO expenses (
            amount, description, date, category, owner, payment_method,
            status, confirmed_at, organization_id, user_id, created_at, source
        )
        SELECT 
            amount, description, date, category, owner,
            CASE 
                WHEN payment_method = 'credit_card' THEN 'credit_card'
                WHEN payment_method = 'cash' THEN 'cash'
                ELSE 'other'
            END,
            'confirmed', confirmed_at, 
            (SELECT organization_id FROM users LIMIT 1), -- Assumir primeira organização
            (SELECT id FROM users LIMIT 1), -- Assumir primeiro usuário
            created_at, 'manual'
        FROM expenses_general
        WHERE NOT EXISTS (
            SELECT 1 FROM expenses WHERE expenses.id = expenses_general.id
        );
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
    END IF;
    
    RETURN FORMAT('Migração concluída: %s registros migrados', migrated_count);
END;
$$ LANGUAGE plpgsql;

-- 7. Comentários das tabelas
-- ============================================
COMMENT ON TABLE expenses IS 'Tabela unificada para todas as despesas (cartão, débito, PIX, dinheiro, etc.)';
COMMENT ON TABLE cards IS 'Cartões de crédito/débito por organização com controle de ciclos de faturamento';

COMMENT ON COLUMN expenses.payment_method IS 'Define se a despesa aparece em /cards ou /finance';
COMMENT ON COLUMN expenses.card_id IS 'Referência ao cartão específico (apenas para payment_method = credit_card)';
COMMENT ON COLUMN cards.billing_day IS 'Dia do mês em que a fatura fecha (1-31)';
COMMENT ON COLUMN cards.best_day IS 'Melhor dia para fazer compras no cartão';
COMMENT ON COLUMN cards.due_date IS 'Data de vencimento da fatura atual';
