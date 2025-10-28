-- Políticas RLS para o bucket de avatares (Versão Corrigida)
-- Execute este SQL após criar o bucket "avatar" no Supabase Storage

-- IMPORTANTE: Certifique-se de que o bucket "avatar" foi criado primeiro
-- Via Dashboard: Storage → Buckets → New bucket → Name: "avatar" → Public: Yes

-- Remover políticas antigas se existirem (opcional)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 1. Permitir que usuários autenticados façam upload de seus próprios avatares
-- O arquivo deve estar em uma pasta com o mesmo nome do user_id
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'avatar') AND
  ((storage.foldername(name))[1] = (auth.uid())::text)
);

-- 2. Permitir leitura pública de avatares (para exibição)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatar');

-- 3. Permitir que usuários atualizem seus próprios avatares
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  (bucket_id = 'avatar') AND
  ((storage.foldername(name))[1] = (auth.uid())::text)
)
WITH CHECK (
  (bucket_id = 'avatar') AND
  ((storage.foldername(name))[1] = (auth.uid())::text)
);

-- 4. Permitir que usuários deletem seus próprios avatares
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  (bucket_id = 'avatar') AND
  ((storage.foldername(name))[1] = (auth.uid())::text)
);

-- ============================================
-- ALTERNATIVA: Políticas simplificadas
-- Use estas se as políticas acima não funcionarem
-- (permite upload na raiz do bucket sem estrutura de pastas)
-- ============================================

/*
-- Descomente estas se precisar de políticas mais simples:

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatar');

CREATE POLICY "Avatars are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatar');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatar')
WITH CHECK (bucket_id = 'avatar');

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatar');
*/

