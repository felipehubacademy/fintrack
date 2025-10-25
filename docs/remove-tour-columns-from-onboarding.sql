-- Remover colunas de tour da tabela onboarding_progress
-- Tours agora são gerenciados na tabela user_tours

-- Remover funções antigas que usavam organization_id
DROP FUNCTION IF EXISTS is_tour_completed(UUID, UUID, VARCHAR(50));
DROP FUNCTION IF EXISTS mark_tour_completed(UUID, UUID, VARCHAR(50));
DROP FUNCTION IF EXISTS get_completed_tours(UUID, UUID);
DROP FUNCTION IF EXISTS reset_tours(UUID, UUID);

-- Remover índices relacionados aos tours
DROP INDEX IF EXISTS idx_onboarding_completed_tours;
DROP INDEX IF EXISTS idx_onboarding_last_tour_viewed;

-- Remover colunas de tour
ALTER TABLE public.onboarding_progress 
DROP COLUMN IF EXISTS completed_tours;

ALTER TABLE public.onboarding_progress 
DROP COLUMN IF EXISTS tour_data;

ALTER TABLE public.onboarding_progress 
DROP COLUMN IF EXISTS last_tour_viewed;

ALTER TABLE public.onboarding_progress 
DROP COLUMN IF EXISTS last_tour_at;

-- Comentário de limpeza
COMMENT ON TABLE onboarding_progress IS 'Progresso do onboarding por usuário e organização (sem dados de tour)';
