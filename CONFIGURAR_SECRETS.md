# 🔐 Configurar Secrets - Passo a Passo

## Problema Identificado
O workflow está executando, mas não está fazendo as chamadas porque o `CRON_SECRET` não está configurado no GitHub Secrets.

## Solução

### 1. Gerar o CRON_SECRET
Execute este comando para gerar um secret seguro:
```bash
openssl rand -hex 32
```

**IMPORTANTE**: Copie o valor gerado! Você precisará usar o MESMO valor em dois lugares.

### 2. Configurar no GitHub
1. Acesse: https://github.com/felipehubacademy/fintrack/settings/secrets/actions
2. Clique em **"New repository secret"**
3. Configure:
   - **Name**: `CRON_SECRET`
   - **Secret**: (cole o valor gerado no passo 1)
4. Clique em **"Add secret"**

### 3. Configurar no Vercel
1. Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
2. Clique em **"Add New"**
3. Configure:
   - **Key**: `CRON_SECRET`
   - **Value**: (cole o MESMO valor do passo 1)
   - **Environment**: Selecione todas (Production, Preview, Development)
4. Clique em **"Save"**
5. **IMPORTANTE**: Faça um redeploy da aplicação no Vercel para aplicar a nova variável

### 4. (Opcional) Configurar APP_URL no GitHub
1. Acesse: https://github.com/felipehubacademy/fintrack/settings/secrets/actions
2. Clique em **"New repository secret"**
3. Configure:
   - **Name**: `APP_URL`
   - **Secret**: `https://fintrack-web.vercel.app`
4. Clique em **"Add secret"**

## Testar
Após configurar:
1. Execute o workflow manualmente: https://github.com/felipehubacademy/fintrack/actions/workflows/daily-notifications.yml
2. Clique em **"Run workflow"**
3. Verifique os logs - deve mostrar "✅ CRON_SECRET configurado"
4. Verifique se as chamadas foram feitas com sucesso (HTTP 200)

## Verificar se há contas vencendo amanhã
Para testar se o endpoint funciona, você precisa ter contas no banco com:
- `status = 'pending'`
- `due_date = amanhã (formato YYYY-MM-DD)`
- `user.whatsapp_phone` configurado

