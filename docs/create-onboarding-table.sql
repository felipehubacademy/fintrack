-- Tabela de progresso do onboarding
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_steps JSONB DEFAULT '[]',
  is_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped BOOLEAN DEFAULT FALSE,
  step_data JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_organization_id ON onboarding_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_progress(is_completed);

-- RLS (Row Level Security) - DESABILITADO para testes
ALTER TABLE onboarding_progress DISABLE ROW LEVEL SECURITY;

-- NOTA: RLS foi desabilitado para facilitar testes
-- Em produção, reative o RLS com as políticas de segurança

-- Função para limpar dados de onboarding antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_onboarding_data()
RETURNS void AS $$
BEGIN
  -- Remove dados de onboarding de usuários que não existem mais
  DELETE FROM onboarding_progress 
  WHERE user_id NOT IN (SELECT id FROM users);
  
  -- Remove dados de onboarding de organizações que não existem mais
  DELETE FROM onboarding_progress 
  WHERE organization_id NOT IN (SELECT id FROM organizations);
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE onboarding_progress IS 'Progresso do onboarding de usuários';
COMMENT ON COLUMN onboarding_progress.user_id IS 'ID do usuário';
COMMENT ON COLUMN onboarding_progress.organization_id IS 'ID da organização';
COMMENT ON COLUMN onboarding_progress.current_step IS 'Step atual do onboarding (0-7)';
COMMENT ON COLUMN onboarding_progress.completed_steps IS 'Array de steps completados';
COMMENT ON COLUMN onboarding_progress.is_completed IS 'Se o onboarding foi completado';
COMMENT ON COLUMN onboarding_progress.step_data IS 'Dados específicos de cada step';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Tabela de onboarding criada com sucesso!';
  RAISE NOTICE 'Execute cleanup_old_onboarding_data() periodicamente para limpar dados antigos.';
END $$;
