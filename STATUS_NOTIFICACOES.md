# 📊 Status do Fluxo de Notificações

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### 1. Código
- ✅ Endpoint `/api/notifications/check-bills-due-tomorrow` criado
- ✅ Função `sendBillReminderTemplate` implementada
- ✅ Correção de `whatsapp_phone` → `phone` em todos os arquivos
- ✅ CORS e OPTIONS handling adicionado
- ✅ Autenticação via `CRON_SECRET` implementada
- ✅ Logs detalhados para debug

### 2. GitHub Actions
- ✅ Workflow `.github/workflows/daily-notifications.yml` configurado
- ✅ Agendado para rodar 2x por dia (8h e 20h BRT)
- ✅ Verificação de secrets implementada
- ✅ Fallback para `APP_URL` configurado

### 3. Documentação
- ✅ Template WhatsApp documentado em `docs/WHATSAPP_TEMPLATES.md`
- ✅ Instruções de configuração em `CONFIGURAR_SECRETS.md`
- ✅ Documentação de notificações em `docs/NOTIFICATIONS_SETUP.md`

---

## ❓ O QUE PRECISA SER VERIFICADO/TESTADO

### 1. Configuração de Secrets

#### GitHub Secrets
- [ ] `CRON_SECRET` configurado
  - Acesse: https://github.com/felipehubacademy/fintrack/settings/secrets/actions
  - Verifique se existe `CRON_SECRET`
  - Se não existir, adicione (gerar com: `openssl rand -hex 32`)

- [ ] `APP_URL` configurado (opcional, tem fallback)
  - Acesse: https://github.com/felipehubacademy/fintrack/settings/secrets/actions
  - Verifique se existe `APP_URL`
  - Se não existir, o workflow usa: `https://www.meuazulao.com.br`

#### Vercel Environment Variables
- [ ] `CRON_SECRET` configurado (mesmo valor do GitHub)
  - Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
  - Verifique se existe `CRON_SECRET`
  - **IMPORTANTE**: Deve ser o MESMO valor do GitHub Secrets

- [ ] `WHATSAPP_TOKEN` configurado
  - Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
  - Verifique se existe `WHATSAPP_TOKEN`

- [ ] `PHONE_ID` configurado
  - Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
  - Verifique se existe `PHONE_ID`

- [ ] `SUPABASE_URL` configurado
  - Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
  - Verifique se existe `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL`

- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
  - Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/settings/environment-variables
  - Verifique se existe `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_KEY`

### 2. Template WhatsApp

- [ ] Template `bill_reminder_amanha` criado no WhatsApp Business Manager
  - Acesse: https://business.facebook.com/
  - Vá em: Ferramentas > WhatsApp Manager > Templates de Mensagem
  - Verifique se o template `bill_reminder_amanha` existe
  - Verifique se está **APROVADO** (status: Aprovado)
  - Verifique se a categoria é **UTILITY** (SERVIÇO)

- [ ] Template tem a estrutura correta:
  ```
  Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

  {{4}}

  Total: R$ {{5}}

  Acesse o MeuAzulão para ver detalhes.
  ```

### 3. Dados no Banco

- [ ] Usuários têm `phone` cadastrado
  - Verifique no Supabase: `SELECT id, name, phone FROM users WHERE phone IS NOT NULL;`
  - Pelo menos um usuário deve ter telefone cadastrado para testar

- [ ] Contas a pagar com vencimento amanhã
  - Para testar, crie uma conta com `due_date = amanhã`
  - Status deve ser `pending` ou `overdue`
  - `notified_at` deve ser `NULL` ou anterior a hoje

### 4. Teste do Endpoint

#### Teste Manual via cURL
```bash
# Substitua SEU_CRON_SECRET pelo valor real
curl -X POST https://www.meuazulao.com.br/api/notifications/check-bills-due-tomorrow \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -v
```

**Resposta esperada:**
- ✅ HTTP 200: Sucesso
- ✅ JSON com `success: true` e `count` de notificações
- ❌ HTTP 401: `CRON_SECRET` incorreto ou não configurado
- ❌ HTTP 500: Erro no servidor (ver logs do Vercel)

#### Teste via GitHub Actions
1. Acesse: https://github.com/felipehubacademy/fintrack/actions/workflows/daily-notifications.yml
2. Clique em "Run workflow"
3. Selecione branch `main`
4. Clique em "Run workflow"
5. Acompanhe os logs

**Logs esperados:**
- ✅ "✅ CRON_SECRET configurado"
- ✅ "✅ APP_URL configurado" (ou aviso de fallback)
- ✅ "HTTP Status: 200"
- ✅ Resposta JSON com `success: true`

### 5. Verificação de Logs

#### Vercel Logs
- Acesse: https://vercel.com/felipexavier1987-gmailcoms-projects/fintrack-web/functions
- Procure por `check-bills-due-tomorrow`
- Verifique se há logs de execução
- Verifique se há erros

#### GitHub Actions Logs
- Acesse: https://github.com/felipehubacademy/fintrack/actions
- Clique na execução mais recente
- Expanda os steps para ver detalhes
- Verifique se as chamadas foram feitas com sucesso

---

## 🧪 COMO TESTAR AGORA

### Passo 1: Verificar Secrets
```bash
# Verificar se CRON_SECRET está configurado no GitHub
# (não há comando CLI, verificar via interface web)
```

### Passo 2: Testar Endpoint Localmente (se tiver servidor rodando)
```bash
# No terminal, com o servidor Next.js rodando
curl -X POST http://localhost:3000/api/notifications/check-bills-due-tomorrow \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Passo 3: Testar Endpoint em Produção
```bash
# Substitua SEU_CRON_SECRET pelo valor real
curl -X POST https://www.meuazulao.com.br/api/notifications/check-bills-due-tomorrow \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -v
```

### Passo 4: Executar Workflow Manualmente
1. Acesse: https://github.com/felipehubacademy/fintrack/actions/workflows/daily-notifications.yml
2. Clique em "Run workflow"
3. Acompanhe os logs

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: HTTP 401 Unauthorized
**Causa**: `CRON_SECRET` não configurado ou incorreto
**Solução**: 
1. Verifique se `CRON_SECRET` está configurado no GitHub Secrets
2. Verifique se `CRON_SECRET` está configurado no Vercel (mesmo valor)
3. Verifique se está usando o mesmo valor em ambos os lugares

### Problema: HTTP 500 Server Error
**Causa**: Variáveis de ambiente não configuradas no Vercel
**Solução**:
1. Verifique se `SUPABASE_URL` está configurado
2. Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurado
3. Verifique se `WHATSAPP_TOKEN` está configurado
4. Verifique se `PHONE_ID` está configurado
5. Faça redeploy após adicionar variáveis

### Problema: Template não encontrado
**Causa**: Template `bill_reminder_amanha` não existe ou não está aprovado
**Solução**:
1. Acesse WhatsApp Business Manager
2. Crie o template seguindo `docs/WHATSAPP_TEMPLATES.md`
3. Aguarde aprovação (pode levar algumas horas)

### Problema: Nenhuma notificação enviada
**Causa**: Não há contas vencendo amanhã ou usuários sem telefone
**Solução**:
1. Verifique se há contas com `due_date = amanhã`
2. Verifique se os usuários têm `phone` cadastrado
3. Verifique se `status = 'pending'` ou `'overdue'`

### Problema: Workflow não executa
**Causa**: Cron schedule incorreto ou workflow desabilitado
**Solução**:
1. Verifique se o workflow está habilitado
2. Execute manualmente para testar
3. Verifique se o horário do cron está correto

---

## ✅ CHECKLIST FINAL

Antes de considerar o fluxo "resolvido", verifique:

- [ ] `CRON_SECRET` configurado no GitHub Secrets
- [ ] `CRON_SECRET` configurado no Vercel (mesmo valor)
- [ ] `WHATSAPP_TOKEN` configurado no Vercel
- [ ] `PHONE_ID` configurado no Vercel
- [ ] `SUPABASE_URL` configurado no Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado no Vercel
- [ ] Template `bill_reminder_amanha` criado e aprovado
- [ ] Endpoint testado manualmente (retorna 200)
- [ ] Workflow testado manualmente (executa com sucesso)
- [ ] Logs do Vercel mostram execução sem erros
- [ ] Pelo menos uma notificação foi enviada com sucesso

---

## 📝 PRÓXIMOS PASSOS

1. **Verificar Secrets**: Confirme que todos os secrets estão configurados
2. **Testar Endpoint**: Execute o teste manual via cURL
3. **Testar Workflow**: Execute o workflow manualmente no GitHub Actions
4. **Verificar Logs**: Confira os logs do Vercel e GitHub Actions
5. **Criar Conta de Teste**: Crie uma conta vencendo amanhã para testar
6. **Aguardar Execução Automática**: Aguarde o próximo horário agendado (8h ou 20h BRT)

---

**Última atualização**: 2025-01-06




