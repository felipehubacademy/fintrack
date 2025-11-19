-- Migration: Criar tabela de investimentos (carteira consolidada)
-- Data: 2025-11-19
-- Descrição: Tabela para gerenciar investimentos reais do usuário (ações, fundos, tesouro, etc)
-- NOTA: Mantém as tabelas existentes investment_goals e investment_contributions para metas de aportes

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Informações básicas
  name VARCHAR(255) NOT NULL, -- Nome/Código do investimento (ex: PETR4, Tesouro Selic 2027)
  type VARCHAR(50) NOT NULL, -- Tipo: stocks, funds, treasury, fixed_income, crypto, other
  broker VARCHAR(255), -- Corretora/Banco (ex: XP, Rico, Nubank)
  goal_id UUID, -- Vinculação opcional com meta de investimento
  
  -- Valores
  invested_amount NUMERIC(14,2) NOT NULL, -- Valor investido inicialmente
  current_value NUMERIC(14,2), -- Valor atual (atualizado manualmente)
  quantity NUMERIC(14,6), -- Quantidade de cotas/ações
  
  -- Datas
  purchase_date DATE NOT NULL, -- Data da compra/aporte
  last_updated_at TIMESTAMP WITH TIME ZONE, -- Última atualização do valor
  
  -- Metadata
  notes TEXT, -- Observações
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT investments_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES investment_goals(id) ON DELETE SET NULL,
  CONSTRAINT investments_invested_amount_positive CHECK (invested_amount > 0),
  CONSTRAINT investments_current_value_positive CHECK (current_value IS NULL OR current_value >= 0),
  CONSTRAINT investments_quantity_positive CHECK (quantity IS NULL OR quantity > 0),
  CONSTRAINT investments_type_check CHECK (type IN (
    'stocks', 'funds', 'treasury', 'fixed_income', 'crypto', 'other'
  ))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_organization_id ON investments(organization_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
CREATE INDEX IF NOT EXISTS idx_investments_purchase_date ON investments(purchase_date);

-- RLS (Row Level Security)
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas investimentos da sua organização
CREATE POLICY "Users can view investments from their organization"
  ON investments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem inserir investimentos na sua organização
CREATE POLICY "Users can insert investments in their organization"
  ON investments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem atualizar investimentos da sua organização
CREATE POLICY "Users can update investments from their organization"
  ON investments FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Política: Usuários podem deletar investimentos da sua organização
CREATE POLICY "Users can delete investments from their organization"
  ON investments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_investments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_investments_updated_at();

-- Comentários para documentação
COMMENT ON TABLE investments IS 'Investimentos reais do usuário (ações, fundos, tesouro, renda fixa, cripto) - Carteira consolidada';
COMMENT ON COLUMN investments.type IS 'Tipo: stocks (ações), funds (fundos), treasury (tesouro), fixed_income (renda fixa), crypto (criptomoedas), other (outros)';
COMMENT ON COLUMN investments.invested_amount IS 'Valor total investido (custo de aquisição)';
COMMENT ON COLUMN investments.current_value IS 'Valor atual do investimento (atualizado manualmente pelo usuário)';
COMMENT ON COLUMN investments.quantity IS 'Quantidade de cotas/ações/moedas';
COMMENT ON COLUMN investments.goal_id IS 'Vinculação opcional com meta de investimento (investment_goals) para rastreamento de progresso';

