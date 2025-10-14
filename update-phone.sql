-- Atualizar telefone do usuário Felipe Xavier
UPDATE users 
SET 
  phone = '5511978229898',
  updated_at = NOW()
WHERE email = 'felipe.xavier1987@gmail.com';

-- Verificar se foi atualizado
SELECT id, name, email, phone, updated_at 
FROM users 
WHERE email = 'felipe.xavier1987@gmail.com';
