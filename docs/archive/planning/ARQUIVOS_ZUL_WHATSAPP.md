# 📁 ARQUIVOS ENVOLVIDOS NO FLUXO DO ZUL NO WHATSAPP

## 🎯 Arquivos Principais (Ordem de Execução)

### 1. **backend/api/webhook.js** - Entrada do WhatsApp
- Recebe mensagens do WhatsApp via webhook
- Busca usuário por telefone
- Monta contexto (cartões, organização)
- Chama `ZulAssistant.processMessage()`
- Envia resposta via WhatsApp

### 2. **backend/services/zulAssistant.js** - Cérebro do ZUL
- Classe principal que gerencia toda a conversa
- Usa GPT-4o-mini para conversas naturais
- Função `save_expense` (context.saveExpense) - salva despesas
- Inferência automática de categorias
- Normalização de texto (case/acentos)
- Histórico de conversas
- Mensagens de confirmação variadas

### 3. **backend/services/whatsapp.js** - Utilitários WhatsApp
- Funções para enviar mensagens via WhatsApp API
- Parse de respostas de botões

### 4. **backend/routes/whatsapp.js** - Rotas Express (alternativa)
- Rota alternativa para webhook do WhatsApp
- Principalmente para respostas de botões

---

## 🔄 FLUXO COMPLETO

```
WhatsApp Webhook
    ↓
backend/api/webhook.js
    ├─ getUserByPhone() - Busca usuário
    ├─ Busca cartões disponíveis
    └─ Chama ZulAssistant.processMessage()
         ↓
backend/services/zulAssistant.js
    ├─ sendConversationalMessage() - Converte mensagem com GPT
    ├─ getConversationalInstructions() - Prompt do GPT
    ├─ save_expense (context.saveExpense) - Função que salva despesa
    │   ├─ Normaliza payment_method
    │   ├─ Busca cost_center_id (com suporte a primeiro nome)
    │   ├─ Inferência automática de categoria (catHints + synonyms)
    │   ├─ Validação obrigatória de categoria
    │   ├─ Subfluxo de cartão de crédito (cartão + parcelas)
    │   ├─ Criação de parcelas futuras
    │   └─ Mensagem de confirmação
    └─ Retorna resposta ao webhook
         ↓
backend/api/webhook.js
    └─ sendWhatsAppMessage() - Envia resposta via WhatsApp
```

---

## 📋 ARQUIVOS DETALHADOS

### Arquivo 1: backend/api/webhook.js
**Função:** Recebe webhook do WhatsApp e chama ZulAssistant

### Arquivo 2: backend/services/zulAssistant.js  
**Função:** Lógica completa do ZUL (1884 linhas)
- Classe ZulAssistant
- Métodos principais:
  - `processMessage()` - ponto de entrada
  - `sendConversationalMessage()` - conversa com GPT
  - `save_expense` (dentro de context) - salva despesa
  - Funções de normalização e inferência

### Arquivo 3: backend/services/whatsapp.js
**Função:** Utilitários para enviar mensagens WhatsApp

### Arquivo 4: backend/routes/whatsapp.js
**Função:** Rotas Express alternativas (principalmente botões)

---

## ⚠️ Arquivos Relacionados (Não usados no fluxo WhatsApp atual)

- `backend/services/zulMessages.js` - Mensagens pré-formatadas (não usado no fluxo puro)
- `backend/services/smartConversation.js` - Fluxo antigo (desabilitado)
- `backend/services/zulWebChat.js` - Para chat web (não WhatsApp)

