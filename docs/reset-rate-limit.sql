-- Script para resetar rate limit de verificação de WhatsApp
-- Use durante testes ou em casos excepcionais

-- Ver status atual de um usuário específico (por email)
SELECT 
  id,
  name,
  email,
  phone,
  phone_verified,
  verification_attempts,
  last_verification_attempt,
  CASE 
    WHEN last_verification_attempt IS NULL THEN 'Nunca tentou'
    WHEN last_verification_attempt < NOW() - INTERVAL '1 hour' THEN 'Pode tentar (passou 1h)'
    ELSE CONCAT('Bloqueado por mais ', 
                EXTRACT(EPOCH FROM (last_verification_attempt + INTERVAL '1 hour' - NOW())) / 60, 
                ' minutos')
  END as status
FROM users
WHERE email = 'email@exemplo.com'; -- Trocar pelo email do usuário

-- Resetar rate limit de um usuário específico
UPDATE users
SET 
  verification_attempts = 0,
  last_verification_attempt = NULL
WHERE email = 'email@exemplo.com'; -- Trocar pelo email do usuário

-- Resetar rate limit de TODOS os usuários (cuidado!)
-- UPDATE users
-- SET 
--   verification_attempts = 0,
--   last_verification_attempt = NULL;

-- Ver todos os códigos de verificação pendentes
SELECT 
  vc.id,
  vc.code,
  vc.type,
  vc.created_at,
  vc.expires_at,
  vc.used_at,
  vc.verified_at,
  u.name,
  u.email,
  u.phone,
  CASE 
    WHEN vc.verified_at IS NOT NULL THEN '✅ Verificado'
    WHEN vc.used_at IS NOT NULL THEN '🔄 Usado mas não verificado'
    WHEN vc.expires_at < NOW() THEN '❌ Expirado'
    ELSE '⏳ Pendente'
  END as status
FROM verification_codes vc
JOIN users u ON vc.user_id = u.id
ORDER BY vc.created_at DESC
LIMIT 20;

-- Limpar códigos expirados (mais de 10 minutos)
DELETE FROM verification_codes
WHERE expires_at < NOW()
AND verified_at IS NULL;

-- Ver estatísticas gerais
SELECT 
  COUNT(*) FILTER (WHERE verification_attempts >= 3) as usuarios_bloqueados,
  COUNT(*) FILTER (WHERE phone_verified = true) as usuarios_verificados,
  COUNT(*) FILTER (WHERE phone_verified = false) as usuarios_nao_verificados,
  COUNT(*) as total_usuarios
FROM users;

