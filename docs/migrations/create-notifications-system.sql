-- ============================================================================
-- MIGRATION: Create Notifications System
-- Description: Sistema completo de notificações com tabelas, funções e índices
-- Date: 2025-10-24
-- Execute no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PARTE 1: Criar tabelas do sistema de notificações
-- ============================================================================

-- 1.1. Tabela notifications (notificações in-app)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'bill_reminder', 'investment_reminder', 'budget_alert', 
        'daily_reminder', 'weekly_report', 'monthly_report', 
        'insight', 'expense_confirmation', 'system_alert'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    sent_via TEXT DEFAULT 'inapp' CHECK (sent_via IN ('whatsapp', 'email', 'inapp')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.2. Tabela user_preferences (preferências de notificação)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 1.3. Tabela notification_templates (templates de mensagens)
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'inapp')),
    template_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.4. Tabela notification_history (histórico de envios)
CREATE TABLE IF NOT EXISTS notification_history (
    id BIGSERIAL PRIMARY KEY,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    error_message TEXT,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'inapp')),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PARTE 2: Criar índices para performance
-- ============================================================================

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_via ON notifications(sent_via);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Índices para user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_organization_id ON user_preferences(organization_id);

-- Índices para notification_templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;

-- Índices para notification_history
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_history_channel ON notification_history(channel);

-- ============================================================================
-- PARTE 3: Habilitar RLS (Row Level Security)
-- ============================================================================

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for users"
ON notifications FOR INSERT
WITH CHECK (true);

-- RLS para user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON user_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON user_preferences FOR ALL
USING (user_id = auth.uid());

-- RLS para notification_templates (apenas leitura para usuários)
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active templates"
ON notification_templates FOR SELECT
USING (is_active = true);

-- RLS para notification_history (apenas leitura para usuários)
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification history"
ON notification_history FOR SELECT
USING (user_id = auth.uid());

-- ============================================================================
-- PARTE 4: Criar funções SQL auxiliares
-- ============================================================================

-- 4.1. Função para calcular uso de orçamento
CREATE OR REPLACE FUNCTION get_budget_usage(org_id UUID, cat_id UUID, month_year TEXT)
RETURNS TABLE(
    category_id UUID,
    budget_limit DECIMAL(10,2),
    spent_amount DECIMAL(10,2),
    usage_percentage DECIMAL(5,2),
    remaining_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH budget_data AS (
        SELECT 
            b.limit_amount,
            COALESCE(SUM(e.amount), 0) as spent
        FROM budgets b
        LEFT JOIN expenses e ON e.category_id = b.category_id 
            AND e.organization_id = b.organization_id
            AND e.status IN ('confirmed', 'paid')
            AND TO_CHAR(e.date, 'YYYY-MM') = month_year
        WHERE b.organization_id = org_id 
            AND b.category_id = cat_id
            AND TO_CHAR(b.month_year, 'YYYY-MM') = month_year
        GROUP BY b.limit_amount
    )
    SELECT 
        cat_id as category_id,
        bd.limit_amount as budget_limit,
        bd.spent as spent_amount,
        CASE 
            WHEN bd.limit_amount > 0 THEN (bd.spent / bd.limit_amount) * 100
            ELSE 0
        END as usage_percentage,
        GREATEST(0, bd.limit_amount - bd.spent) as remaining_amount
    FROM budget_data bd;
END;
$$ LANGUAGE plpgsql;

-- 4.2. Função para analisar padrões de gastos do usuário
CREATE OR REPLACE FUNCTION get_user_expense_patterns(user_uuid UUID, days_back INTEGER)
RETURNS TABLE(
    hour_of_day INTEGER,
    day_of_week INTEGER,
    avg_amount DECIMAL(10,2),
    expense_count BIGINT,
    most_common_category TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH expense_patterns AS (
        SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            EXTRACT(DOW FROM created_at) as dow,
            amount,
            bc.name as category_name
        FROM expenses e
        LEFT JOIN budget_categories bc ON bc.id = e.category_id
        WHERE e.user_id = user_uuid
            AND e.created_at >= NOW() - INTERVAL '1 day' * days_back
            AND e.status IN ('confirmed', 'paid')
    )
    SELECT 
        ep.hour::INTEGER as hour_of_day,
        ep.dow::INTEGER as day_of_week,
        ROUND(AVG(ep.amount), 2) as avg_amount,
        COUNT(*) as expense_count,
        MODE() WITHIN GROUP (ORDER BY ep.category_name) as most_common_category
    FROM expense_patterns ep
    GROUP BY ep.hour, ep.dow
    ORDER BY ep.hour, ep.dow;
END;
$$ LANGUAGE plpgsql;

-- 4.3. Função para resumo semanal
CREATE OR REPLACE FUNCTION get_weekly_summary(org_id UUID, week_start_date DATE)
RETURNS TABLE(
    total_spent DECIMAL(10,2),
    category_totals JSONB,
    cost_center_totals JSONB,
    expense_count BIGINT,
    avg_daily_spent DECIMAL(10,2)
) AS $$
DECLARE
    week_end_date DATE := week_start_date + INTERVAL '6 days';
BEGIN
    RETURN QUERY
    WITH weekly_expenses AS (
        SELECT 
            e.amount,
            bc.name as category_name,
            cc.name as cost_center_name
        FROM expenses e
        LEFT JOIN budget_categories bc ON bc.id = e.category_id
        LEFT JOIN cost_centers cc ON cc.id = e.cost_center_id
        WHERE e.organization_id = org_id
            AND e.date >= week_start_date
            AND e.date <= week_end_date
            AND e.status IN ('confirmed', 'paid')
    ),
    category_agg AS (
        SELECT jsonb_object_agg(category_name, category_total) as category_totals
        FROM (
            SELECT 
                category_name,
                SUM(amount) as category_total
            FROM weekly_expenses
            WHERE category_name IS NOT NULL
            GROUP BY category_name
            ORDER BY category_total DESC
        ) cat
    ),
    cost_center_agg AS (
        SELECT jsonb_object_agg(cost_center_name, cost_center_total) as cost_center_totals
        FROM (
            SELECT 
                cost_center_name,
                SUM(amount) as cost_center_total
            FROM weekly_expenses
            WHERE cost_center_name IS NOT NULL
            GROUP BY cost_center_name
            ORDER BY cost_center_total DESC
        ) cc
    )
    SELECT 
        COALESCE(SUM(we.amount), 0) as total_spent,
        COALESCE(ca.category_totals, '{}'::jsonb) as category_totals,
        COALESCE(cca.cost_center_totals, '{}'::jsonb) as cost_center_totals,
        COUNT(*) as expense_count,
        ROUND(COALESCE(SUM(we.amount), 0) / 7, 2) as avg_daily_spent
    FROM weekly_expenses we
    CROSS JOIN category_agg ca
    CROSS JOIN cost_center_agg cca;
END;
$$ LANGUAGE plpgsql;

-- 4.4. Função para insights mensais
CREATE OR REPLACE FUNCTION get_monthly_insights(org_id UUID, month_year TEXT)
RETURNS TABLE(
    total_income DECIMAL(10,2),
    total_expense DECIMAL(10,2),
    balance DECIMAL(10,2),
    top_categories JSONB,
    expense_trend JSONB,
    budget_performance JSONB
) AS $$
DECLARE
    month_start DATE := (month_year || '-01')::DATE;
    month_end DATE := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    prev_month_start DATE := (month_start - INTERVAL '1 month')::DATE;
    prev_month_end DATE := (month_end - INTERVAL '1 month')::DATE;
BEGIN
    RETURN QUERY
    WITH current_month AS (
        SELECT 
            COALESCE(SUM(CASE WHEN i.amount IS NOT NULL THEN i.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN e.amount IS NOT NULL THEN e.amount ELSE 0 END), 0) as expense
        FROM generate_series(month_start, month_end, '1 day'::interval) d
        LEFT JOIN incomes i ON i.date = d::DATE AND i.organization_id = org_id AND i.status = 'confirmed'
        LEFT JOIN expenses e ON e.date = d::DATE AND e.organization_id = org_id AND e.status IN ('confirmed', 'paid')
    ),
    previous_month AS (
        SELECT 
            COALESCE(SUM(CASE WHEN i.amount IS NOT NULL THEN i.amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN e.amount IS NOT NULL THEN e.amount ELSE 0 END), 0) as expense
        FROM generate_series(prev_month_start, prev_month_end, '1 day'::interval) d
        LEFT JOIN incomes i ON i.date = d::DATE AND i.organization_id = org_id AND i.status = 'confirmed'
        LEFT JOIN expenses e ON e.date = d::DATE AND e.organization_id = org_id AND e.status IN ('confirmed', 'paid')
    ),
    top_categories AS (
        SELECT jsonb_object_agg(category_name, category_data) as top_categories
        FROM (
            SELECT 
                bc.name as category_name,
                jsonb_build_object(
                    'amount', SUM(e.amount),
                    'count', COUNT(*),
                    'percentage', ROUND((SUM(e.amount) / NULLIF((SELECT SUM(amount) FROM expenses WHERE organization_id = org_id AND date >= month_start AND date <= month_end AND status IN ('confirmed', 'paid')), 0)) * 100, 2)
                ) as category_data
            FROM expenses e
            JOIN budget_categories bc ON bc.id = e.category_id
            WHERE e.organization_id = org_id
                AND e.date >= month_start
                AND e.date <= month_end
                AND e.status IN ('confirmed', 'paid')
            GROUP BY bc.name
            ORDER BY SUM(e.amount) DESC
            LIMIT 5
        ) cat
    ),
    expense_trend AS (
        SELECT jsonb_build_object(
            'current_month', cm.expense,
            'previous_month', pm.expense,
            'change_percentage', CASE 
                WHEN pm.expense > 0 THEN ROUND(((cm.expense - pm.expense) / pm.expense) * 100, 2)
                ELSE 0
            END,
            'trend', CASE 
                WHEN cm.expense > pm.expense THEN 'up'
                WHEN cm.expense < pm.expense THEN 'down'
                ELSE 'stable'
            END
        ) as expense_trend
        FROM current_month cm, previous_month pm
    ),
    budget_performance AS (
        SELECT jsonb_object_agg(category_name, budget_data) as budget_performance
        FROM (
            SELECT 
                bc.name as category_name,
                jsonb_build_object(
                    'budget_limit', b.limit_amount,
                    'spent', COALESCE(SUM(e.amount), 0),
                    'usage_percentage', ROUND((COALESCE(SUM(e.amount), 0) / NULLIF(b.limit_amount, 0)) * 100, 2),
                    'status', CASE 
                        WHEN COALESCE(SUM(e.amount), 0) > b.limit_amount THEN 'over'
                        WHEN COALESCE(SUM(e.amount), 0) > b.limit_amount * 0.9 THEN 'warning'
                        ELSE 'ok'
                    END
                ) as budget_data
            FROM budgets b
            JOIN budget_categories bc ON bc.id = b.category_id
            LEFT JOIN expenses e ON e.category_id = b.category_id 
                AND e.organization_id = b.organization_id
                AND e.date >= month_start 
                AND e.date <= month_end
                AND e.status IN ('confirmed', 'paid')
            WHERE b.organization_id = org_id
                AND TO_CHAR(b.month_year, 'YYYY-MM') = month_year
            GROUP BY bc.name, b.limit_amount
        ) budget
    )
    SELECT 
        cm.income as total_income,
        cm.expense as total_expense,
        (cm.income - cm.expense) as balance,
        COALESCE(tc.top_categories, '{}'::jsonb) as top_categories,
        COALESCE(et.expense_trend, '{}'::jsonb) as expense_trend,
        COALESCE(bp.budget_performance, '{}'::jsonb) as budget_performance
    FROM current_month cm
    CROSS JOIN top_categories tc
    CROSS JOIN expense_trend et
    CROSS JOIN budget_performance bp;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 5: Inserir templates padrão
-- ============================================================================

-- Templates de notificação WhatsApp
INSERT INTO notification_templates (type, channel, template_text, variables, is_active) VALUES
('daily_reminder', 'whatsapp', 'Oi {{userName}}! Já registrou seus gastos de hoje? 📊\n\n{{streakMessage}}\n\nAcesse: {{appUrl}}', '["userName", "streakMessage", "appUrl"]', true),
('budget_alert', 'whatsapp', '⚠️ *Alerta de Orçamento*\n\n{{categoryName}}: {{percentage}}% usado\nGasto: R$ {{spent}} de R$ {{limit}}\n\n{{projectionMessage}}', '["categoryName", "percentage", "spent", "limit", "projectionMessage"]', true),
('weekly_report', 'whatsapp', '📊 *Relatório Semanal*\n\n💰 Total: R$ {{totalSpent}} ({{changePercent}}% vs semana passada)\n\n📈 Top Categorias:\n{{topCategories}}\n\n💡 Insight: {{insight}}', '["totalSpent", "changePercent", "topCategories", "insight"]', true),
('monthly_report', 'whatsapp', '📈 *Relatório Mensal - {{monthName}}*\n\n💰 Entradas: R$ {{totalIncome}}\n💸 Saídas: R$ {{totalExpense}}\n📊 Saldo: R$ {{balance}} ({{balanceStatus}})\n\n{{topCategories}}\n\n{{recommendations}}', '["monthName", "totalIncome", "totalExpense", "balance", "balanceStatus", "topCategories", "recommendations"]', true),
('insight', 'whatsapp', '💡 *Insight Financeiro*\n\n{{insightText}}\n\n{{actionSuggestion}}', '["insightText", "actionSuggestion"]', true),
('bill_reminder', 'whatsapp', '🔔 *Lembretes de Contas a Pagar*\n\nOlá {{userName}}! Você tem {{count}} conta(s) vencendo hoje:\n\n{{billsList}}\n\nAcesse: {{appUrl}}', '["userName", "count", "billsList", "appUrl"]', true),
('investment_reminder', 'whatsapp', '🎯 *Meta de Investimento*\n\n{{goalName}}: {{progress}}% concluída\nValor restante: R$ {{remaining}}\n\n{{motivationMessage}}', '["goalName", "progress", "remaining", "motivationMessage"]', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PARTE 6: Comentários e documentação
-- ============================================================================

COMMENT ON TABLE notifications IS 'Notificações in-app do sistema';
COMMENT ON COLUMN notifications.type IS 'Tipo da notificação: bill_reminder, investment_reminder, budget_alert, etc';
COMMENT ON COLUMN notifications.data IS 'Dados adicionais da notificação em formato JSON';
COMMENT ON COLUMN notifications.priority IS 'Prioridade: low, normal, high, urgent';

COMMENT ON TABLE user_preferences IS 'Preferências de notificação dos usuários';
COMMENT ON COLUMN user_preferences.settings IS 'Configurações de notificação em formato JSON';

COMMENT ON TABLE notification_templates IS 'Templates de mensagens para diferentes canais';
COMMENT ON COLUMN notification_templates.template_text IS 'Texto do template com variáveis {{variavel}}';
COMMENT ON COLUMN notification_templates.variables IS 'Array de variáveis disponíveis no template';

COMMENT ON TABLE notification_history IS 'Histórico de envio de notificações';
COMMENT ON COLUMN notification_history.delivery_status IS 'Status de entrega: pending, sent, delivered, failed, bounced';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de notificações criado com sucesso!';
  RAISE NOTICE '📊 Tabelas: notifications, user_preferences, notification_templates, notification_history';
  RAISE NOTICE '🔧 Funções: get_budget_usage, get_user_expense_patterns, get_weekly_summary, get_monthly_insights';
  RAISE NOTICE '📱 Templates WhatsApp: 7 templates padrão inseridos';
  RAISE NOTICE '🔒 RLS: Políticas de segurança configuradas';
END $$;
