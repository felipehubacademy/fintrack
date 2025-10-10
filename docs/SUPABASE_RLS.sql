-- FinTrack - Row Level Security (RLS) Configuration
-- Controle de acesso: apenas emails autorizados

-- 1. Criar tabela de usuários permitidos
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Inserir emails permitidos (Felipe e Letícia)
INSERT INTO allowed_users (email, name) VALUES
  ('seu@email.com', 'Felipe'),
  ('leticia@email.com', 'Letícia')
ON CONFLICT (email) DO NOTHING;

-- 3. Habilitar RLS na tabela expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 4. Política: Apenas usuários autorizados podem ver expenses
CREATE POLICY "Apenas usuários autorizados podem ver expenses"
ON expenses
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM allowed_users
  )
);

-- 5. Política: Apenas usuários autorizados podem inserir
CREATE POLICY "Apenas usuários autorizados podem inserir"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM allowed_users
  )
);

-- 6. Política: Apenas usuários autorizados podem atualizar
CREATE POLICY "Apenas usuários autorizados podem atualizar"
ON expenses
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM allowed_users
  )
);

-- 7. Política: allowed_users - apenas autenticados podem ver
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver allowed_users"
ON allowed_users
FOR SELECT
TO authenticated
USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS configurado com sucesso!';
  RAISE NOTICE 'Apenas emails em allowed_users podem acessar.';
  RAISE NOTICE 'Para adicionar mais usuários:';
  RAISE NOTICE 'INSERT INTO allowed_users (email, name) VALUES (''novo@email.com'', ''Nome'');';
END $$;

