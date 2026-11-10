# Guia de Setup - Belvo Open Finance

## 1. Obter Credenciais Belvo

1. Acesse [dashboard.belvo.com](https://dashboard.belvo.com)
2. Faça login ou crie uma conta
3. Navegue para Settings > API Keys
4. Copie:
   - Secret ID
   - Secret Password
   - App ID (para My Belvo Portal)

## 2. Configurar Variáveis de Ambiente

### Local Development (.env.local):

```bash
# Belvo Production Credentials
BELVO_SECRET_ID=your_prod_secret_id
BELVO_SECRET_PASSWORD=your_prod_secret_password
BELVO_API_URL=https://api.belvo.com
BELVO_WIDGET_URL=https://widget.belvo.com
BELVO_APP_ID=your_app_id
NEXT_PUBLIC_BELVO_APP_ID=your_app_id
NEXT_PUBLIC_BELVO_ENABLED=true

# Application URL (for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel (Production):

Adicione as mesmas variáveis no painel Vercel:
- Settings > Environment Variables
- Adicione todas as variáveis acima
- Marque como disponível para: Production, Preview, Development

## 3. Executar Migration SQL

Execute o arquivo de migration no Supabase:

```bash
# Via Supabase Dashboard: SQL Editor
# ou via CLI:
supabase db reset
# Depois execute:
docs/migrations/2025-11-17-belvo-open-finance-integration.sql
```

## 4. Configurar Webhook na Dashboard Belvo

1. Acesse Belvo Dashboard > Settings > Webhooks
2. Adicione webhook URL: `https://seu-dominio.vercel.app/api/belvo/webhooks`
3. Selecione eventos:
   - `historical_update`
   - `new_transactions_available`
   - `consent_expired`
4. Salve e copie o Signing Secret (para validação futura)

## 5. Configurar Backend Routes

Adicione as rotas Belvo ao seu servidor backend (Vercel Functions):

Crie/atualize `web/pages/api/belvo/[...path].js`:

```javascript
import {
  generateWidgetSession,
  listLinks,
  getLinkDetails,
  syncLink,
  deleteLink,
  listInstitutions,
  pullTransactions,
  handleWebhook
} from '../../../../backend/api/belvo';

export default async function handler(req, res) {
  const { path } = req.query;
  const route = path.join('/');

  switch (route) {
    case 'widget-session':
      if (req.method === 'POST') return generateWidgetSession(req, res);
      break;
    
    case 'links':
      if (req.method === 'GET') return listLinks(req, res);
      break;
    
    case 'webhooks':
      if (req.method === 'POST') return handleWebhook(req, res);
      break;
    
    case 'institutions':
      if (req.method === 'GET') return listInstitutions(req, res);
      break;
    
    case 'transactions/pull':
      if (req.method === 'POST') return pullTransactions(req, res);
      break;
    
    default:
      // Handle dynamic routes like /links/:id
      if (route.startsWith('links/') && req.method === 'GET') {
        return getLinkDetails(req, res);
      }
      if (route.startsWith('links/') && route.endsWith('/sync') && req.method === 'POST') {
        return syncLink(req, res);
      }
      if (route.startsWith('links/') && req.method === 'DELETE') {
        return deleteLink(req, res);
      }
  }

  res.status(404).json({ error: 'Not found' });
}
```

## 6. Testar Integração

### Teste Manual:

1. Acesse `/dashboard/bank-accounts`
2. Clique em "Conectar Banco"
3. Preencha CPF e nome completo
4. Selecione um banco (use sandbox se disponível)
5. Faça login com credenciais de teste
6. Autorize o compartilhamento de dados
7. Aguarde sincronização
8. Verifique se transações aparecem no FinTrack

### Teste via Webhook:

Use Postman ou curl para enviar webhook de teste:

```bash
curl -X POST https://seu-app.vercel.app/api/belvo/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_id": "test-webhook-123",
    "webhook_type": "historical_update",
    "link": "test-link-id",
    "data": {
      "resource_type": "ACCOUNTS",
      "resources": [...]
    }
  }'
```

## 7. Monitoramento

### Logs a Observar:

- ✅ Widget session created
- ✅ Link saved to database
- ✅ Webhook processed
- ✅ Transactions created
- ❌ Erros de conexão
- ❌ Webhooks duplicados

### Ferramentas:

- Vercel Logs (dashboard ou CLI)
- Supabase Logs (Table Editor > belvo_webhooks_processed)
- Belvo Dashboard > Activity Logs

## 8. Troubleshooting

### Problema: Widget não carrega
**Solução:** Verifique BELVO_SECRET_ID e BELVO_SECRET_PASSWORD

### Problema: Webhook não processa
**Solução:** 
- Verifique URL do webhook na Belvo Dashboard
- Confirme que rota `/api/belvo/webhooks` existe
- Cheque logs do Vercel

### Problema: Transações não aparecem
**Solução:**
- Verifique tabela `belvo_webhooks_processed`
- Confirme categorias mapeadas corretamente
- Rode sync manual via `/api/belvo/links/:id/sync`

### Problema: Consent expired
**Solução:**
- Usuário deve renovar via My Belvo Portal
- Link aparecerá automaticamente na página de contas

## 9. Segurança

### Checklist:

- [ ] Nunca commitar credenciais no git
- [ ] Usar HTTPS em produção
- [ ] Validar signature dos webhooks (TODO: implementar)
- [ ] Rate limiting nas rotas de API
- [ ] Logs não devem conter dados sensíveis

## 10. Documentação de Referência

- [Belvo Docs](https://developers.belvo.com)
- [Open Finance Brasil](https://openbankingbrasil.org.br)
- Arquivo interno: `docs/BELVO_CONFIRMED.md`
- Arquivo interno: `docs/BELVO_RESEARCH_COMPLETE.md`

---

**Status da Implementação:** ✅ Completa  
**Versão:** 1.0  
**Última Atualização:** 17/11/2025

