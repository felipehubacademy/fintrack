-- ============================================================================
-- EXECUTAR ESTE SCRIPT NO SUPABASE SQL EDITOR
-- ============================================================================
-- Migration: Create Financial Goals Tables
-- Data: 12/11/2025
-- Descrição: Criar tabelas para sistema de metas financeiras
-- ============================================================================

-- 1. Criar tabela de metas financeiras
-- ============================================
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Informações básicas
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('emergency_fund', 'debt_payment', 'purchase', 'investment', 'savings')),
  
  -- Valores
  target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(10,2) DEFAULT 0 CHECK (current_amount >= 0),
  monthly_contribution DECIMAL(10,2),
  
  -- Datas
  target_date DATE,
  started_at DATE DEFAULT CURRENT_DATE,
  completed_at DATE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  
  -- Metadata
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_financial_goals_org ON financial_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON financial_goals(goal_type);

-- 3. Criar tabela de contribuições para metas
-- ============================================
CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL,
  contribution_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Link com transação (opcional - para futuro)
  transaction_id BIGINT REFERENCES expenses(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(contribution_date);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_org ON goal_contributions(organization_id);

-- 4. Função para atualizar current_amount automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_new_amount DECIMAL(10,2);
  v_target_amount DECIMAL(10,2);
BEGIN
  -- Determinar o goal_id (funciona para INSERT, UPDATE e DELETE)
  DECLARE
    v_goal_id UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_goal_id := OLD.goal_id;
    ELSE
      v_goal_id := NEW.goal_id;
    END IF;
    
    -- Recalcular current_amount baseado nas contribuições
    SELECT COALESCE(SUM(amount), 0)
    INTO v_new_amount
    FROM goal_contributions
    WHERE goal_id = v_goal_id;
    
    -- Buscar target_amount
    SELECT target_amount
    INTO v_target_amount
    FROM financial_goals
    WHERE id = v_goal_id;
    
    -- Atualizar current_amount
    UPDATE financial_goals
    SET 
      current_amount = v_new_amount,
      updated_at = NOW()
    WHERE id = v_goal_id;
    
    -- Verificar se atingiu a meta
    IF v_new_amount >= v_target_amount THEN
      UPDATE financial_goals
      SET 
        status = 'completed',
        completed_at = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = v_goal_id
        AND status = 'active';
    END IF;
  END;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualizar current_amount
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount
AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
FOR EACH ROW
EXECUTE FUNCTION update_goal_current_amount();

-- 6. Trigger para atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goals_timestamp ON financial_goals;
CREATE TRIGGER trigger_update_goals_timestamp
BEFORE UPDATE ON financial_goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Função para calcular projeção de atingimento
-- ============================================
CREATE OR REPLACE FUNCTION calculate_goal_projection(p_goal_id UUID)
RETURNS TABLE (
  months_to_complete INTEGER,
  projected_completion_date DATE,
  monthly_needed DECIMAL(10,2),
  on_track BOOLEAN
) AS $$
DECLARE
  v_goal RECORD;
  v_avg_monthly_contribution DECIMAL(10,2);
  v_months_remaining INTEGER;
BEGIN
  -- Buscar informações da meta
  SELECT 
    target_amount,
    current_amount,
    monthly_contribution,
    started_at,
    target_date
  INTO v_goal
  FROM financial_goals
  WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular média de contribuições mensais (últimos 3 meses)
  SELECT COALESCE(AVG(monthly_total), 0)
  INTO v_avg_monthly_contribution
  FROM (
    SELECT 
      DATE_TRUNC('month', contribution_date) as month,
      SUM(amount) as monthly_total
    FROM goal_contributions
    WHERE goal_id = p_goal_id
      AND contribution_date >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY DATE_TRUNC('month', contribution_date)
  ) monthly_contributions;
  
  -- Se não tem histórico, usar monthly_contribution definida
  IF v_avg_monthly_contribution = 0 THEN
    v_avg_monthly_contribution := COALESCE(v_goal.monthly_contribution, 0);
  END IF;
  
  -- Calcular meses para completar
  IF v_avg_monthly_contribution > 0 THEN
    months_to_complete := CEIL((v_goal.target_amount - v_goal.current_amount) / v_avg_monthly_contribution);
    projected_completion_date := CURRENT_DATE + (months_to_complete || ' months')::INTERVAL;
  ELSE
    months_to_complete := NULL;
    projected_completion_date := NULL;
  END IF;
  
  -- Calcular quanto precisa por mês para atingir no prazo
  IF v_goal.target_date IS NOT NULL THEN
    v_months_remaining := EXTRACT(MONTH FROM AGE(v_goal.target_date, CURRENT_DATE));
    IF v_months_remaining > 0 THEN
      monthly_needed := (v_goal.target_amount - v_goal.current_amount) / v_months_remaining;
    ELSE
      monthly_needed := v_goal.target_amount - v_goal.current_amount;
    END IF;
  ELSE
    monthly_needed := NULL;
  END IF;
  
  -- Verificar se está no caminho certo
  IF v_goal.target_date IS NOT NULL AND v_avg_monthly_contribution > 0 THEN
    on_track := (projected_completion_date <= v_goal.target_date);
  ELSE
    on_track := NULL;
  END IF;
  
  RETURN QUERY SELECT 
    months_to_complete,
    projected_completion_date,
    monthly_needed,
    on_track;
END;
$$ LANGUAGE plpgsql;

-- 8. Comentários
-- ============================================
COMMENT ON TABLE financial_goals IS 'Metas financeiras dos usuários';
COMMENT ON TABLE goal_contributions IS 'Histórico de contribuições para as metas';
COMMENT ON FUNCTION update_goal_current_amount() IS 'Atualiza current_amount e status da meta automaticamente';
COMMENT ON FUNCTION calculate_goal_projection(UUID) IS 'Calcula projeção de atingimento da meta';

-- 9. Verificação
-- ============================================
-- Verificar se as tabelas foram criadas
SELECT 'financial_goals' as tabela, COUNT(*) as registros FROM financial_goals
UNION ALL
SELECT 'goal_contributions' as tabela, COUNT(*) as registros FROM goal_contributions;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
-- PRÓXIMO PASSO: Testar criando uma meta pela interface
-- ============================================================================

