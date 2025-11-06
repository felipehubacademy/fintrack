# 📋 Checklist de Secrets - GitHub Actions

## Secrets Necessários para Daily Notifications

### 1. APP_URL
- **Descrição**: URL base da aplicação (Vercel)
- **Valor esperado**: `https://fintrack-web.vercel.app` (ou sua URL customizada)
- **Onde configurar**: GitHub > Settings > Secrets and variables > Actions
- **Status**: ⚠️ Opcional (tem fallback para `https://fintrack-web.vercel.app`)

### 2. CRON_SECRET
- **Descrição**: Token secreto para autenticar chamadas do cron
- **Como gerar**: 
  ```bash
  openssl rand -hex 32
  ```
- **Onde configurar**: GitHub > Settings > Secrets and variables > Actions
- **Status**: ❌ **OBRIGATÓRIO** (sem isso, as chamadas falharão com 401)
- **Importante**: Deve ser o mesmo valor configurado no Vercel como variável de ambiente

## Secrets Necessários para Cleanup (outro workflow)

### 3. SUPABASE_URL
- **Descrição**: URL do projeto Supabase
- **Onde encontrar**: Supabase Dashboard > Settings > API

### 4. SUPABASE_SERVICE_KEY
- **Descrição**: Service Role Key do Supabase
- **Onde encontrar**: Supabase Dashboard > Settings > API > service_role key

## Variáveis de Ambiente no Vercel

As mesmas variáveis precisam estar configuradas no Vercel (fintrack-web):

- `CRON_SECRET` (mesmo valor do GitHub) ⚠️ **OBRIGATÓRIO**
- `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_KEY`
- `PHONE_ID` (WhatsApp Phone Number ID)
- `WHATSAPP_TOKEN` (WhatsApp Access Token)

## Como Verificar

1. **GitHub Secrets**: 
   - Acesse: https://github.com/felipehubacademy/fintrack/settings/secrets/actions
   - Verifique se os secrets estão listados

2. **Vercel Environment Variables**:
   - Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
   - Verifique se as variáveis estão configuradas

3. **Testar Workflow**:
   - Execute o workflow manualmente: https://github.com/felipehubacademy/fintrack/actions/workflows/daily-notifications.yml
   - Clique em "Run workflow"
   - Verifique os logs do step "Verificar Secrets Configurados"

## Como Configurar

### No GitHub:
1. Acesse: https://github.com/felipehubacademy/fintrack/settings/secrets/actions
2. Clique em "New repository secret"
3. Adicione cada secret:
   - Name: `APP_URL`
   - Secret: `https://fintrack-web.vercel.app`
   - Name: `CRON_SECRET`
   - Secret: (gerar com `openssl rand -hex 32`)

### No Vercel:
1. Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
2. Adicione as variáveis necessárias
3. **Importante**: Use o mesmo valor de `CRON_SECRET` do GitHub

## Gerar CRON_SECRET

```bash
# Gerar um secret seguro
openssl rand -hex 32
```

Copie o resultado e use o mesmo valor em:
- GitHub Secret: `CRON_SECRET`
- Vercel Environment Variable: `CRON_SECRET`

