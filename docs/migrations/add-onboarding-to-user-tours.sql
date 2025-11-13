-- Adicionar coluna completed_onboarding à tabela user_tours
-- Para armazenar onboarding completado (similar a completed_tours)

-- Adicionar coluna completed_onboarding (JSONB)
ALTER TABLE public.user_tours 
ADD COLUMN IF NOT EXISTS completed_onboarding JSONB DEFAULT '{}'::jsonb;

-- Índice GIN para performance em queries JSONB
CREATE INDEX IF NOT EXISTS idx_user_tours_completed_onboarding 
ON public.user_tours USING GIN (completed_onboarding);

-- Comentário para documentação
COMMENT ON COLUMN user_tours.completed_onboarding IS 'Onboarding completado pelo usuário (ex: {"goals": true, "insights": true})';

-- Função para verificar se um onboarding foi completado
CREATE OR REPLACE FUNCTION is_onboarding_completed(
  p_user_id UUID,
  p_onboarding_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tours 
    WHERE user_id = p_user_id 
      AND completed_onboarding ? p_onboarding_type
      AND (completed_onboarding->>p_onboarding_type)::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar onboarding como completado
CREATE OR REPLACE FUNCTION mark_onboarding_completed(
  p_user_id UUID,
  p_onboarding_type VARCHAR(50)
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_tours (user_id, completed_onboarding)
  VALUES (
    p_user_id, 
    jsonb_build_object(p_onboarding_type, true)
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    completed_onboarding = COALESCE(user_tours.completed_onboarding, '{}'::jsonb) || jsonb_build_object(p_onboarding_type, true),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter todos os onboarding completados
CREATE OR REPLACE FUNCTION get_completed_onboarding(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT completed_onboarding INTO result
  FROM user_tours 
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

