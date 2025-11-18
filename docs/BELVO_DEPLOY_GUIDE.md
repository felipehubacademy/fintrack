# 🚀 Guia de Deploy - Belvo Open Finance

## 📋 Checklist Pré-Deploy

### ✅ Já Feito (Desenvolvimento Local)
- [x] Widget Belvo funcionando
- [x] Links salvos no banco
- [x] Rotas API criadas
- [x] Webhook implementado
- [x] Migration executada

---

## 🌐 1. Deploy no Vercel

### A. Fazer Push do Código

```bash
git add .
git commit -m "feat: Belvo Open Finance integration"
git push origin main
```

### B. Vercel vai fazer deploy automático
- Aguarde 2-3 minutos
- Verifique se build passou: https://vercel.com/dashboard

---

## 🔧 2. Configurar Variáveis de Ambiente no Vercel

### Acesse: https://vercel.com → Seu Projeto → Settings → Environment Variables

Adicione as mesmas variáveis do `.env.local`:

```bash
BELVO_SECRET_ID=e4ed767e-fcf5-44bc-9367-a83964c3e6d0
BELVO_SECRET_PASSWORD=uv5fA4Wz6Gn-IWCDmabiam6gcn3I_wmqzbUBMA_Tsy8zU4fjv4Y7oNqFevtL0xOc
BELVO_API_URL=https://sandbox.belvo.com
BELVO_WIDGET_URL=https://cdn.belvo.io
NEXT_PUBLIC_BELVO_APP_ID=meuazulao-sandbox
```

**IMPORTANTE:** Marque todas como disponíveis em:
- ✅ Production
- ✅ Preview
- ✅ Development

### C. Redeploy (se já estava deployado)

```bash
# No terminal ou no Vercel Dashboard: Deployments → ... → Redeploy
```

---

## 🔔 3. Configurar Webhook na Belvo

### A. Acesse o Dashboard da Belvo
👉 https://dashboard.belvo.com/

### B. Vá em: **Settings → Webhooks**

### C. Criar Novo Webhook

**Webhook URL:**
```
https://www.meuazulao.com.br/api/belvo/webhooks
```

⚠️ **IMPORTANTE:** Use `www.meuazulao.com.br` (com www) para evitar redirects!

### D. Selecionar Eventos

Marque os seguintes eventos:

- ✅ `historical_update.accounts`
- ✅ `historical_update.transactions`  
- ✅ `historical_update.bills`
- ✅ `new_transactions_available`
- ✅ `consent_expired`

### E. Salvar

Copie o **Webhook Secret** (se houver) e adicione no Vercel:

```bash
BELVO_WEBHOOK_SECRET=seu_secret_aqui
```

---

## ✅ 4. Testar Conexão em Produção

### A. Acesse seu app deployado
```
https://meuazulao.com.br/dashboard/bank-accounts
```

### B. Clique em "Conectar Banco"

### C. Conecte com banco de teste:
- **Banco:** Erebor Bank
- **Username:** `erebor_retail`
- **Password:** `gringotts`

### D. Aguarde sincronização

A Belvo vai enviar webhook e você deve ver:
- ✅ Contas aparecendo na lista
- ✅ Badge "🔗 Belvo"
- ✅ Transações sincronizadas

---

## 🐛 5. Debug / Troubleshooting

### Ver logs do webhook:

**Vercel:**
```
Vercel Dashboard → Seu Projeto → Functions → /api/belvo/webhooks → View Logs
```

**Belvo Dashboard:**
```
Settings → Webhooks → Delivery History
```

### Testar webhook manualmente:

Use a ferramenta de teste da Belvo ou curl:

```bash
curl -X POST https://meuazulao.com.br/api/belvo/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_id": "test-123",
    "webhook_type": "HISTORICAL_UPDATE",
    "link_id": "SEU_LINK_ID",
    "data": {}
  }'
```

---

## 🎯 6. Migrar para Produção (Bancos Reais)

Quando estiver pronto para produção:

### A. Solicitar Credenciais de Produção

Entre em contato com Belvo para ativar produção.

### B. Atualizar Variáveis no Vercel

```bash
BELVO_SECRET_ID=NOVO_ID_PRODUCAO
BELVO_SECRET_PASSWORD=NOVA_SENHA_PRODUCAO
BELVO_API_URL=https://api.belvo.com
NEXT_PUBLIC_BELVO_APP_ID=meuazulao
```

### C. Atualizar Webhook URL

No dashboard da Belvo (produção):
```
https://meuazulao.com.br/api/belvo/webhooks
```

### D. Testar com banco real

Agora aparecerão:
- Nubank
- Itaú
- Bradesco
- Banco do Brasil
- Santander
- Inter
- C6 Bank
- etc.

---

## 📊 7. Monitoramento

### Verificar status dos links:

```sql
SELECT 
  institution_name,
  status,
  last_sync_at,
  created_at
FROM belvo_links
WHERE organization_id = 'SEU_ORG_ID'
ORDER BY created_at DESC;
```

### Ver contas conectadas:

```sql
SELECT 
  name,
  bank,
  provider,
  data_source,
  is_active
FROM bank_accounts
WHERE provider = 'belvo'
  AND organization_id = 'SEU_ORG_ID';
```

### Ver transações Belvo:

```sql
SELECT 
  description,
  amount,
  date,
  is_belvo_payload
FROM expenses
WHERE is_belvo_payload = true
  AND organization_id = 'SEU_ORG_ID'
ORDER BY date DESC
LIMIT 50;
```

---

## 🎉 Pronto!

Sua integração Belvo está completa e funcionando em produção! 🚀

### Próximos passos opcionais:

1. **My Belvo Portal** - Link para usuários gerenciarem consentimentos
2. **Sync manual** - Botão para forçar sincronização
3. **Notificações** - Avisar quando consentimento expirar
4. **Relatórios** - Analytics de contas conectadas

---

## 📞 Suporte

- **Belvo Docs:** https://developers.belvo.com/
- **Belvo Support:** support@belvo.com
- **Dashboard Belvo:** https://dashboard.belvo.com/

