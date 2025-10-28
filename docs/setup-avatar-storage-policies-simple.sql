-- Políticas RLS SIMPLIFICADAS para o bucket de avatares
-- Execute este SQL após criar o bucket "avatar" no Supabase Storage
-- Esta versão simplificada funciona sem estrutura de pastas

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- 1. Permitir que usuários autenticados façam upload de avatares
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatar');

-- 2. Leitura pública de avatares
CREATE POLICY "Avatars are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatar');

-- 3. Permitir que usuários atualizem avatares
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatar')
WITH CHECK (bucket_id = 'avatar');

-- 4. Permitir que usuários deletem avatares
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatar');

