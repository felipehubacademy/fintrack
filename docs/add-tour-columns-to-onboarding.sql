-- Adicionar colunas de tour à tabela onboarding_progress existente

-- Adicionar coluna para tours completados (JSONB para flexibilidade)
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS completed_tours JSONB DEFAULT '{}'::jsonb;

-- Adicionar coluna para dados dos tours (progresso, preferências, etc.)
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS tour_data JSONB DEFAULT '{}'::jsonb;

-- Adicionar coluna para último tour visualizado
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS last_tour_viewed VARCHAR(50) DEFAULT NULL;

-- Adicionar coluna para data do último tour
ALTER TABLE public.onboarding_progress 
ADD COLUMN IF NOT EXISTS last_tour_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_onboarding_completed_tours 
ON public.onboarding_progress USING GIN (completed_tours);

CREATE INDEX IF NOT EXISTS idx_onboarding_last_tour_viewed 
ON public.onboarding_progress (last_tour_viewed);

-- Função para verificar se um tour foi completado
CREATE OR REPLACE FUNCTION is_tour_completed(
  p_user_id UUID,
  p_organization_id UUID,
  p_tour_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM onboarding_progress 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id 
      AND completed_tours ? p_tour_type
      AND (completed_tours->>p_tour_type)::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar tour como completado
CREATE OR REPLACE FUNCTION mark_tour_completed(
  p_user_id UUID,
  p_organization_id UUID,
  p_tour_type VARCHAR(50)
) RETURNS VOID AS $$
BEGIN
  INSERT INTO onboarding_progress (user_id, organization_id, completed_tours, last_tour_viewed, last_tour_at)
  VALUES (
    p_user_id, 
    p_organization_id, 
    jsonb_build_object(p_tour_type, true), 
    p_tour_type, 
    NOW()
  )
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET 
    completed_tours = onboarding_progress.completed_tours || jsonb_build_object(p_tour_type, true),
    last_tour_viewed = p_tour_type,
    last_tour_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter todos os tours completados
CREATE OR REPLACE FUNCTION get_completed_tours(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT completed_tours INTO result
  FROM onboarding_progress 
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resetar tours (manter apenas onboarding)
CREATE OR REPLACE FUNCTION reset_tours(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE onboarding_progress 
  SET 
    completed_tours = '{}'::jsonb,
    last_tour_viewed = NULL,
    last_tour_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON COLUMN onboarding_progress.completed_tours IS 'Tours completados pelo usuário (ex: {"dashboard": true, "transactions": true})';
COMMENT ON COLUMN onboarding_progress.tour_data IS 'Dados adicionais dos tours (preferências, progresso, etc.)';
COMMENT ON COLUMN onboarding_progress.last_tour_viewed IS 'Último tour visualizado pelo usuário';
COMMENT ON COLUMN onboarding_progress.last_tour_at IS 'Data do último tour visualizado';
