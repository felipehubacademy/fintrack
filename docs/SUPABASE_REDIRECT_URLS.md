# URLs de Redirecionamento do Supabase

## 📍 Como Configurar

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **Authentication** → **URL Configuration**
4. Adicione as seguintes URLs em **"Redirect URLs"**:

## 🔗 URLs para Adicionar

```
https://meuazulao.com.br/update-password
https://meuazulao.com.br/dashboard
https://meuazulao.com.br/auth/callback
https://meuazulao.com.br/
```

## 🏠 Site URL

Configure também o **"Site URL"** como:

```
https://meuazulao.com.br
```

## ⚙️ Configurações Adicionais

### Email Templates
Certifique-se que os templates de email estão configurados no Supabase:
- **Authentication** → **Email Templates**
- Usar os templates customizados da pasta `docs/email-templates/`

### SMTP Settings
- Já configurado com SendGrid
- Sender: noreply@meuazulao.com.br

## 🧪 Para Testar Localmente (Desenvolvimento)

Se você quiser testar localmente, adicione também:

```
http://localhost:3000/update-password
http://localhost:3000/dashboard
http://localhost:3000/auth/callback
http://localhost:3000/
```

## ✅ Verificação

Após adicionar as URLs, teste:

1. Vá em `/reset-password`
2. Digite seu email
3. Clique no link do email recebido
4. Deve ir para `/update-password` ✓
5. Após definir senha, vai para `/dashboard` ✓

## ⚠️ Importante

- URLs devem ser **exatas** (com https://)
- Sem barra final (`/`) nas URLs (exceto na raiz)
- Salve as configurações após adicionar

