# Configuração de Notificações Automáticas

Este documento explica como configurar as notificações diárias automáticas para contas a pagar e metas de investimento.

## 📋 Visão Geral

O sistema envia notificações automáticas via WhatsApp para:

1. **Contas a Pagar**: Alertas para contas vencendo no dia
2. **Metas de Investimento**: Lembretes nos dias configurados para aportes

## 🔧 Configuração no GitHub

### 1. Secrets Necessários

No seu repositório GitHub, vá em **Settings > Secrets and variables > Actions** e adicione:

#### `APP_URL`
- **Descrição**: URL base da sua aplicação
- **Exemplo**: `https://fintrack.vercel.app` ou `https://seudominio.com`
- **Uso**: Para fazer chamadas às APIs de notificação

#### `CRON_SECRET`
- **Descrição**: Token secreto para autenticar as chamadas do cron
- **Como gerar**: Use um gerador de UUIDs ou comando: `openssl rand -hex 32`
- **Exemplo**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Uso**: Proteger os endpoints de notificação contra acesso não autorizado

### 2. Como Adicionar Secrets

```bash
# Via GitHub CLI
gh secret set APP_URL --body "https://sua-url.com"
gh secret set CRON_SECRET --body "seu-token-aqui"

# Ou pela interface web:
# 1. Acesse: github.com/seu-usuario/FinTrack/settings/secrets/actions
# 2. Clique em "New repository secret"
# 3. Adicione cada secret
```

## 🌍 Configuração de Variáveis de Ambiente

Adicione no seu arquivo `.env` (ou nas variáveis de ambiente do Vercel/hosting):

```bash
# URL da aplicação (para links nos lembretes)
NEXT_PUBLIC_APP_URL=https://sua-url.com

# Secret para autenticação do cron (mesmo valor do GitHub Secret)
CRON_SECRET=seu-token-aqui
```

## ⏰ Horário das Notificações

O workflow está configurado para rodar diariamente às **9h UTC** (6h BRT).

Para ajustar o horário, edite o arquivo `.github/workflows/daily-notifications.yml`:

```yaml
on:
  schedule:
    # Formato: minuto hora dia mês dia-da-semana
    # Exemplos:
    - cron: '0 9 * * *'   # 9h UTC (6h BRT)
    - cron: '0 12 * * *'  # 12h UTC (9h BRT)
    - cron: '30 8 * * *'  # 8h30 UTC (5h30 BRT)
```

### Tabela de Conversão de Horários

| UTC | BRT (UTC-3) | Descrição |
|-----|-------------|-----------|
| 0h  | 21h (dia anterior) | Final da noite |
| 6h  | 3h | Madrugada |
| 9h  | 6h | Manhã cedo |
| 12h | 9h | Manhã |
| 15h | 12h | Meio-dia |
| 18h | 15h | Tarde |

## 🔔 Como Funcionam as Notificações

### Contas a Pagar

1. **Verificação**: Todo dia às 9h UTC, o sistema busca contas com:
   - `status = 'pending'`
   - `due_date = hoje`
   - `notified_at` null ou anterior a hoje

2. **Mensagem**: Envia uma mensagem WhatsApp com:
   - Lista de contas vencendo
   - Valores
   - Link para marcar como paga

3. **Registro**: Atualiza `notified_at` para evitar duplicatas

### Metas de Investimento

1. **Verificação**: Todo dia às 9h UTC, o sistema busca metas com:
   - `is_active = true`
   - `due_day` correspondente ao dia atual (baseado na `frequency`)
   - `last_notified_at` null ou anterior a hoje

2. **Cálculo**: Para cada meta, calcula:
   - Progresso mensal (aportes confirmados / meta)
   - Valor restante

3. **Mensagem**: Envia uma mensagem WhatsApp com:
   - Nome da meta
   - Progresso atual
   - Valor restante
   - Link para registrar aporte

4. **Registro**: Atualiza `last_notified_at`

## 🧪 Testando as Notificações

### 1. Teste Manual via GitHub Actions

1. Acesse: `github.com/seu-usuario/FinTrack/actions/workflows/daily-notifications.yml`
2. Clique em "Run workflow"
3. Selecione a branch (geralmente `main`)
4. Clique em "Run workflow"
5. Acompanhe os logs na página de execução

### 2. Teste via cURL (local)

```bash
# Testar notificações de contas
curl -X POST http://localhost:3000/api/notifications/check-bills \
  -H "Authorization: Bearer seu-token-aqui" \
  -H "Content-Type: application/json"

# Testar notificações de investimentos
curl -X POST http://localhost:3000/api/notifications/check-investments \
  -H "Authorization: Bearer seu-token-aqui" \
  -H "Content-Type: application/json"
```

### 3. Teste via Postman/Insomnia

**Endpoint**: `POST /api/notifications/check-bills`

**Headers**:
```
Authorization: Bearer seu-token-aqui
Content-Type: application/json
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "X notificações enviadas",
  "count": X,
  "notifications": [...]
}
```

## 📱 Integração WhatsApp (TODO)

Atualmente, os endpoints de notificação **apenas logam** as mensagens no console.

Para enviar mensagens reais via WhatsApp, você precisa:

1. **Escolher um provedor**:
   - [Twilio WhatsApp API](https://www.twilio.com/whatsapp)
   - [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
   - [Evolution API](https://evolution-api.com/) (self-hosted)

2. **Implementar a função de envio** em `backend/services/whatsappService.js`:

```javascript
export async function sendWhatsAppMessage(phone, message) {
  // Exemplo com Twilio
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = require('twilio')(accountSid, authToken);

  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${phone}`,
    body: message
  });
}
```

3. **Descomentar as chamadas** em:
   - `web/pages/api/notifications/check-bills.js`
   - `web/pages/api/notifications/check-investments.js`

```javascript
// Descomentar esta linha:
await sendWhatsAppMessage(user.whatsapp_phone, message);
```

## 📊 Monitoramento

### Logs do GitHub Actions

- Acesse: `github.com/seu-usuario/FinTrack/actions`
- Clique na execução desejada
- Expanda os steps para ver detalhes

### Logs da Aplicação

Se estiver usando Vercel, acesse:
- Dashboard > Seu projeto > Logs
- Filtre por `/api/notifications/`

### Alertas de Falha

Para receber notificações se o cron falhar:

1. Acesse: `github.com/seu-usuario/FinTrack/settings/notifications`
2. Ative "GitHub Actions - Workflow run failures"

## 🔐 Segurança

✅ **Boas práticas implementadas**:
- Autenticação via Bearer token
- Secrets não expostos no código
- Endpoints protegidos contra acesso público
- Rate limiting (considerar adicionar)

⚠️ **Recomendações adicionais**:
- Rotacione o `CRON_SECRET` periodicamente
- Use HTTPS sempre
- Monitore logs para tentativas de acesso não autorizado

## ❓ Troubleshooting

### "Unauthorized"
- Verifique se o `CRON_SECRET` no GitHub Secrets é o mesmo do `.env`
- Confirme que está enviando o header `Authorization: Bearer TOKEN`

### "Method not allowed"
- Certifique-se de usar POST, não GET

### Notificações não estão sendo enviadas
- Verifique se o horário do cron está correto
- Confira se há contas/metas que atendem os critérios
- Veja os logs do GitHub Actions

### Mensagens duplicadas
- Verifique se `notified_at` / `last_notified_at` está sendo atualizado
- Confira se o cron não está rodando múltiplas vezes

## 📝 Próximos Passos

- [ ] Implementar envio real via WhatsApp
- [ ] Adicionar templates de mensagens customizáveis
- [ ] Criar dashboard de monitoramento de notificações
- [ ] Implementar retry logic para falhas
- [ ] Adicionar opção de preferência de horário por usuário
- [ ] Criar notificações por email como fallback

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do GitHub Actions
2. Teste localmente com cURL
3. Consulte a documentação do provedor WhatsApp escolhido

