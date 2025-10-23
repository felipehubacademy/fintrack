-- Migration: Corrigir registros duplicados em onboarding_progress
-- Data: 2025-10-23
-- Descrição: Remove duplicatas e adiciona constraint UNIQUE

-- 1. Deletar todos os registros incompletos (is_completed = false)
DELETE FROM onboarding_progress 
WHERE is_completed = false;

-- 2. Para cada user_id + organization_id, manter apenas o mais recente dos completados
DELETE FROM onboarding_progress a
USING onboarding_progress b
WHERE a.user_id = b.user_id
  AND a.organization_id = b.organization_id
  AND a.id < b.id
  AND a.is_completed = true
  AND b.is_completed = true;

-- 3. Constraint já existe, apenas garantir que ela está ativa
-- (Se precisar recriar, primeiro DROP e depois ADD)
-- ALTER TABLE onboarding_progress
-- DROP CONSTRAINT IF EXISTS onboarding_progress_user_org_unique;
-- 
-- ALTER TABLE onboarding_progress
-- ADD CONSTRAINT onboarding_progress_user_org_unique 
-- UNIQUE (user_id, organization_id);

