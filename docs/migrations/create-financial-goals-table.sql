-- ============================================================================
-- Migration: Create Financial Goals Table
-- Data: 12/11/2025
-- Descrição: Tabela para gerenciar metas financeiras dos usuários
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
  
  amount DECIMAL(10,2) NOT NULL,
  contribution_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  
  -- Link com transação (opcional)
  transaction_id BIGINT REFERENCES expenses(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(contribution_date);

-- 4. Função para atualizar current_amount automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular current_amount baseado nas contribuições
  UPDATE financial_goals
  SET 
    current_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM goal_contributions
      WHERE goal_id = NEW.goal_id
    ),
    updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  -- Verificar se atingiu a meta
  UPDATE financial_goals
  SET 
    status = 'completed',
    completed_at = CURRENT_DATE
  WHERE id = NEW.goal_id
    AND current_amount >= target_amount
    AND status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para atualizar current_amount
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount
AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
FOR EACH ROW
EXECUTE FUNCTION update_goal_current_amount();

-- 6. Função para calcular projeção de atingimento
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
  v_months_elapsed INTEGER;
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
    v_months_elapsed := EXTRACT(MONTH FROM AGE(v_goal.target_date, CURRENT_DATE));
    IF v_months_elapsed > 0 THEN
      monthly_needed := (v_goal.target_amount - v_goal.current_amount) / v_months_elapsed;
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

-- 7. Comentários
-- ============================================
COMMENT ON TABLE financial_goals IS 'Metas financeiras dos usuários';
COMMENT ON TABLE goal_contributions IS 'Histórico de contribuições para as metas';
COMMENT ON FUNCTION update_goal_current_amount() IS 'Atualiza current_amount e status da meta automaticamente';
COMMENT ON FUNCTION calculate_goal_projection(UUID) IS 'Calcula projeção de atingimento da meta';

-- 8. Dados iniciais (exemplos de metas comuns)
-- ============================================
-- Não inserir dados, apenas estrutura

