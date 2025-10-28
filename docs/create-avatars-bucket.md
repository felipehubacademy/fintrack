# Criar Bucket de Avatares no Supabase Storage

## 📦 Como Criar o Bucket Manualmente

O código tenta criar o bucket automaticamente, mas pode falhar por falta de permissões. Para garantir que funcione:

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **Storage** → **Buckets**
4. Clique em **"New bucket"**
5. Configure:
   - **Name**: `avatar`
   - **Public bucket**: ✅ Sim (para permitir acesso público às imagens)
   - **File size limit**: `2097152` (2MB)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`
6. Clique em **"Create bucket"**

### Opção 2: Via SQL (se tiver permissões de service role)

```sql
-- Criar bucket de avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatar',
  'avatar',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);
```

### Opção 3: Configurar Políticas RLS (OBRIGATÓRIO)

Após criar o bucket, **você DEVE configurar as políticas de acesso**. 

Execute o SQL do arquivo `docs/setup-avatar-storage-policies-simple.sql` (versão simplificada - recomendada) ou `docs/setup-avatars-storage-policies.sql`:

```sql
-- 1. Permitir upload de avatares (arquivos em pasta com user_id)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Leitura pública (todos podem ver avatares)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatar');

-- 3. Atualizar próprio avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Deletar próprio avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**⚠️ IMPORTANTE:** Se as políticas acima não funcionarem (por problemas de estrutura de pastas), use as políticas simplificadas do arquivo `setup-avatars-storage-policies.sql`.

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
- **As políticas RLS são OBRIGATÓRIAS** - sem elas o upload vai falhar com erro de permissão
- Os avatares são armazenados em pastas: `{user_id}/{timestamp}.{ext}` para facilitar RLS
- Se ainda assim der erro, veja o console do navegador para detalhes específicos do erro

