# 📱 WHATSAPP BUSINESS API - CONFIGURAÇÃO

## ✅ NÚMERO APROVADO

**WhatsApp Business Account ID:** `1305894714600979`  
**Phone Number ID:** `801805679687987` ✅  
**Número:** `+55 11 5192-8551`

## 🔧 CONFIGURAÇÃO NECESSÁRIA

### 1. Variáveis de Ambiente (Backend)

```bash
# WhatsApp Business API
WHATSAPP_TOKEN=EAAafO1sejkwBPlb4sr9MzpmIioVDxZA1GdizLTeb1cK6oIYucblY0BzCIs9ZAMinB6G5Gw8UWRyCfuwWtkind9dV2R8EZAX2EYvZBrGkp5s2ESjWHPLNnk0aoJTQP8ReUT7JDb2tvINvasc4YuctwYStJhanKKt52PBg8YieZC74U9kRBYeoIXCoixk2AVQZDZD
PHONE_ID=801805679687987
USER_PHONE=+551151928551
WHATSAPP_VERIFY_TOKEN=fintrack_verify_token
```

### 2. Webhook URL

**URL do Webhook:** `https://fintrack-backend-theta.vercel.app/webhook`

**Token de Verificação:** `fintrack_verify_token`

### 3. Configuração no Facebook Developer

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Vá para sua aplicação WhatsApp Business
3. Configure o webhook com a URL acima
4. Use o token de verificação: `fintrack_verify_token`
5. Ative os eventos necessários:
   - `messages`
   - `message_deliveries`
   - `message_reads`

### 4. Teste de Configuração

```bash
# Testar webhook
curl -X GET "https://fintrack-backend.vercel.app/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=fintrack_verify_token"

# Testar envio de mensagem
curl -X POST "https://fintrack-backend.vercel.app/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15551234567",
            "phone_number_id": "787122227826364"
          },
          "messages": [{
            "from": "5511999999999",
            "id": "wamid.test123",
            "timestamp": "1234567890",
            "text": {
              "body": "teste"
            },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

## 📋 CHECKLIST DE CONFIGURAÇÃO

- [x] Phone Number ID atualizado: `801805679687987`
- [ ] Webhook URL configurado no Facebook Developer
- [ ] Token de verificação configurado: `fintrack_verify_token`
- [ ] Eventos do WhatsApp ativados
- [ ] Teste de webhook realizado
- [ ] Teste de envio de mensagem realizado

## 🚨 IMPORTANTE

1. **Número aprovado:** `801805679687987` (+55 11 5192-8551) está aprovado para uso
2. **Webhook:** Deve estar configurado corretamente no Facebook Developer
3. **Token:** Use o token de acesso válido da sua aplicação
4. **Teste:** Sempre teste a configuração antes de usar em produção

---

**📞 Número do WhatsApp:** `801805679687987` (+55 11 5192-8551)  
**🔗 Webhook:** `https://fintrack-backend-theta.vercel.app/webhook`  
**🔑 Token:** `fintrack_verify_token`
