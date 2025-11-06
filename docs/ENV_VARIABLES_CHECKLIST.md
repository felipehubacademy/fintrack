# Checklist de Variáveis de Ambiente

## Variáveis Necessárias para Notificações

### GitHub Secrets (para Actions)
Essas variáveis devem estar configuradas em: `Settings > Secrets and variables > Actions`

1. **APP_URL** (obrigatório)
   - URL base da aplicação no Vercel
   - Exemplo: `https://fintrack-web.vercel.app` ou `https://meuazulao.com.br`
   - Usado por: GitHub Actions para chamar os endpoints

2. **CRON_SECRET** (obrigatório)
   - Token secreto para autenticar chamadas do cron
   - Gerar: `openssl rand -hex 32`
   - Exemplo: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
   - Usado por: Endpoints `/api/notifications/*` para autenticação

### Vercel Environment Variables (para API Routes)
Essas variáveis devem estar configuradas no Vercel Dashboard do projeto `fintrack-web`

1. **SUPABASE_URL** ou **NEXT_PUBLIC_SUPABASE_URL** (obrigatório)
   - URL do projeto Supabase
   - Exemplo: `https://xxxxx.supabase.co`

2. **SUPABASE_SERVICE_ROLE_KEY** ou **SUPABASE_SERVICE_KEY** (obrigatório)
   - Chave de serviço do Supabase (service role key)
   - Permite acesso completo ao banco (sem RLS)
   - **NÃO** usar a chave anon aqui!

3. **PHONE_ID** (obrigatório)
   - ID do número WhatsApp Business
   - Exemplo: `801805679687987`

4. **WHATSAPP_TOKEN** (obrigatório)
   - Token de acesso da API do WhatsApp Business
   - Exemplo: `EAAafO1sejkwBPlb4sr9MzpmIioVDxZA1Gdiz...`

5. **CRON_SECRET** (obrigatório)
   - Mesmo valor configurado no GitHub Secrets
   - Usado para autenticar requisições do cron

6. **NEXT_PUBLIC_APP_URL** (opcional, mas recomendado)
   - URL base da aplicação (para links nas mensagens)
   - Exemplo: `https://meuazulao.com.br`

## Como Verificar

### GitHub Secrets
1. Acesse: `https://github.com/felipehubacademy/fintrack/settings/secrets/actions`
2. Verifique se `APP_URL` e `CRON_SECRET` estão configurados

### Vercel Environment Variables
1. Acesse: `https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables`
2. Verifique se todas as variáveis acima estão configuradas

## Como Testar

Depois de configurar todas as variáveis, teste via GitHub Actions:
1. Acesse: `https://github.com/felipehubacademy/fintrack/actions/workflows/daily-notifications.yml`
2. Clique em "Run workflow"
3. Selecione branch `main`
4. Clique em "Run workflow"
5. Acompanhe os logs

## Troubleshooting

### Erro: "APP_URL não configurado"
- Configure o secret `APP_URL` no GitHub

### Erro: "CRON_SECRET não configurado"
- Configure o secret `CRON_SECRET` no GitHub
- Configure a mesma variável no Vercel

### Erro: "Credenciais WhatsApp não configuradas"
- Configure `PHONE_ID` e `WHATSAPP_TOKEN` no Vercel

### Erro: "Missing Supabase environment variables"
- Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no Vercel

### Erro HTTP 401
- Verifique se `CRON_SECRET` está igual no GitHub e no Vercel

### Erro HTTP 404/405
- Verifique se o endpoint está deployado no Vercel
- Aguarde alguns minutos após o deploy

