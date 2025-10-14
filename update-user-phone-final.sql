-- Script SQL para atualizar telefone do usuário
-- Execute este SQL no Supabase SQL Editor

-- Atualizar telefone do usuário Felipe Xavier
UPDATE users 
SET 
  phone = '5511978229898',
  updated_at = NOW()
WHERE email = 'felipe.xavier1987@gmail.com';

-- Verificar se foi atualizado
SELECT 
  id, 
  name, 
  email, 
  phone, 
  organization_id,
  created_at,
  updated_at 
FROM users 
WHERE email = 'felipe.xavier1987@gmail.com';

-- Verificar se o usuário pode ser encontrado por telefone
SELECT 
  id, 
  name, 
  email, 
  phone 
FROM users 
WHERE phone = '5511978229898' 
  AND is_active = true;
