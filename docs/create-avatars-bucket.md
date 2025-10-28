# Criar Bucket de Avatares no Supabase Storage

## 📦 Como Criar o Bucket Manualmente

O código tenta criar o bucket automaticamente, mas pode falhar por falta de permissões. Para garantir que funcione:

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **Storage** → **Buckets**
4. Clique em **"New bucket"**
5. Configure:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Sim (para permitir acesso público às imagens)
   - **File size limit**: `2097152` (2MB)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`
6. Clique em **"Create bucket"**

### Opção 2: Via SQL (se tiver permissões de service role)

```sql
-- Criar bucket de avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

### Opção 3: Políticas de Acesso RLS (Row Level Security)

Após criar o bucket, configure as políticas de acesso:

```sql
-- Política para permitir upload de avatares (apenas o próprio usuário)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir leitura pública de avatares
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Política para permitir atualização (apenas o próprio usuário)
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir deleção (apenas o próprio usuário)
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## ✅ Verificação

Após criar o bucket, teste:

1. Abra o modal de perfil
2. Clique em "Alterar Foto"
3. Selecione uma imagem
4. Verifique se o upload funciona sem erros

Se encontrar erros de permissão, verifique:
- O bucket foi criado corretamente?
- As políticas RLS estão configuradas?
- O usuário está autenticado?

## 📝 Notas

- O código em `ProfileModal.jsx` tenta criar o bucket automaticamente se não existir
- Se não tiver permissões, o bucket precisa ser criado manualmente via dashboard
- Os avatares são armazenados como: `{user_id}_{timestamp}.{ext}`

