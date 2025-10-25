-- Criar tabela específica para tours de usuários
-- Tours são por usuário, não por organização

CREATE TABLE IF NOT EXISTS public.user_tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_tours JSONB DEFAULT '{}'::jsonb,
  last_tour_viewed VARCHAR(50) DEFAULT NULL,
  last_tour_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_tours_user_id ON public.user_tours (user_id);
CREATE INDEX IF NOT EXISTS idx_user_tours_completed_tours ON public.user_tours USING GIN (completed_tours);
CREATE INDEX IF NOT EXISTS idx_user_tours_last_tour_viewed ON public.user_tours (last_tour_viewed);

-- Função para verificar se um tour foi completado
CREATE OR REPLACE FUNCTION is_tour_completed(
  p_user_id UUID,
  p_tour_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tours 
    WHERE user_id = p_user_id 
      AND completed_tours ? p_tour_type
      AND (completed_tours->>p_tour_type)::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar tour como completado
CREATE OR REPLACE FUNCTION mark_tour_completed(
  p_user_id UUID,
  p_tour_type VARCHAR(50)
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_tours (user_id, completed_tours, last_tour_viewed, last_tour_at)
  VALUES (
    p_user_id, 
    jsonb_build_object(p_tour_type, true), 
    p_tour_type, 
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    completed_tours = user_tours.completed_tours || jsonb_build_object(p_tour_type, true),
    last_tour_viewed = p_tour_type,
    last_tour_at = NOW(),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter todos os tours completados
CREATE OR REPLACE FUNCTION get_completed_tours(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT completed_tours INTO result
  FROM user_tours 
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resetar tours
CREATE OR REPLACE FUNCTION reset_tours(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE user_tours 
  SET 
    completed_tours = '{}'::jsonb,
    last_tour_viewed = NULL,
    last_tour_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE user_tours IS 'Tours completados por usuário (independente da organização)';
COMMENT ON COLUMN user_tours.completed_tours IS 'Tours completados pelo usuário (ex: {"dashboard": true, "transactions": true})';
COMMENT ON COLUMN user_tours.last_tour_viewed IS 'Último tour visualizado pelo usuário';
COMMENT ON COLUMN user_tours.last_tour_at IS 'Data do último tour visualizado';

-- RLS (Row Level Security)
ALTER TABLE user_tours ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver/editar seus próprios tours
CREATE POLICY "Users can manage their own tours" ON user_tours
  FOR ALL USING (auth.uid() = user_id);
