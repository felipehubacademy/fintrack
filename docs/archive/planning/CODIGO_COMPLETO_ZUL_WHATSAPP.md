# 📋 CÓDIGO COMPLETO - ZUL NO WHATSAPP

Este documento lista todos os arquivos e seus códigos completos envolvidos no fluxo do ZUL no WhatsApp.

---

## 🎯 ARQUIVOS PRINCIPAIS (Ordem de Execução)

### 1. **backend/api/webhook.js** (270 linhas)
**Função:** Ponto de entrada do WhatsApp - recebe webhook e chama ZulAssistant

**Código completo:** Ver abaixo

---

### 2. **backend/services/zulAssistant.js** (1884 linhas)
**Função:** Cérebro do ZUL - lógica completa de conversação e salvamento de despesas

**Seções principais:**
- `normalizeText()` - Normalização de texto (case/acentos)
- `extractCoreDescription()` - Extração de descrição core
- `pickVariation()` - Seleção de variações de mensagens
- `getFirstName()` - Extração de primeiro nome
- `save_expense` (dentro de `context.saveExpense`) - Salva despesa com validações
  - Normalização de payment_method
  - Busca de cost_center_id (com suporte a primeiro nome)
  - Inferência automática de categoria (catHints + synonyms)
  - Validação obrigatória de categoria
  - Subfluxo de cartão de crédito (cartão + parcelas)
  - Criação de parcelas futuras
  - Mensagem de confirmação
- `sendConversationalMessage()` - Conversa com GPT-4o-mini
- `getConversationalInstructions()` - Prompt do GPT (1400+ linhas de instruções)
- `getFunctions()` - Funções disponíveis para GPT
- `handleFunctionCall()` - Processa chamadas de funções
- `processMessage()` - Método principal de processamento

**Código completo:** Ver abaixo

---

### 3. **backend/services/whatsapp.js** (67 linhas)
**Função:** Utilitários para enviar mensagens via WhatsApp API

**Código completo:** Ver abaixo

---

### 4. **backend/routes/whatsapp.js** (60 linhas)
**Função:** Rotas Express alternativas (principalmente para respostas de botões)

**Código completo:** Ver abaixo

---

### 5. **backend/services/openaiService.js** (278 linhas)
**Função:** Serviço OpenAI (usado por outros serviços, não diretamente pelo fluxo WhatsApp)

**Código completo:** Ver abaixo

---

### 6. **backend/services/supabase.js** (116 linhas)
**Função:** Cliente Supabase e funções auxiliares

**Código completo:** Ver abaixo

---

## 📝 CÓDIGOS COMPLETOS

### backend/api/webhook.js

```javascript
/**
 * Webhook FinTrack V2 (backend/api) - VERSION B2 (CONSOLIDATED)
 * Consolidado para usar apenas ZulAssistant
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Buscar usuário por telefone
 */
async function getUserByPhone(phone) {
  try {
    const normalized = String(phone || '').replace(/\D/g, '');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('phone', `%${normalized}%`)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) return null;
    
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.organization_id)
      .single();

    const { data: costCenters } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true);

    return {
      ...user,
      organization,
      cost_centers: costCenters || []
    };
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }
}

/**
 * Enviar mensagem WhatsApp
 */
async function sendWhatsAppMessage(to, message) {
  try {
    const axios = (await import('axios')).default;
    const phoneNumberId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Mensagem WhatsApp enviada para', to);
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
  }
}

// Process webhook synchronously com logs detalhados
async function processWebhook(body) {
  console.log('🔄 [B1][DEBUG] Starting processWebhook...');
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Process messages
    if (value?.messages) {
      for (const message of value.messages) {
        if (message.type === 'text') {
          try {
            // Fast path para testes
            if (message.id?.includes('test_') || process.env.WEBHOOK_DRY_RUN === '1') {
              continue;
            }

            // Import dinâmico do ZulAssistant
            const { default: ZulAssistant } = await import('../services/zulAssistant.js');
            const zul = new ZulAssistant();

            // Buscar usuário por telefone
            const user = await getUserByPhone(message.from);
            
            if (!user) {
              await sendWhatsAppMessage(message.from, 
                'Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!'
              );
              continue;
            }

            // Buscar cartões disponíveis
            const { data: cards } = await supabase
              .from('cards')
              .select('name')
              .eq('organization_id', user.organization_id)
              .eq('is_active', true);
            
            // Processar mensagem com ZulAssistant
            const context = {
              userName: user.name,
              userId: user.id,
              organizationId: user.organization_id,
              availableCards: cards?.map(c => c.name) || []
            };
            
            const result = await zul.processMessage(
              message.text.body,
              user.id,
              user.name,
              message.from,
              context
            );
            
            // Enviar resposta via WhatsApp
            if (result && result.message) {
              await sendWhatsAppMessage(message.from, result.message);
            }

          } catch (zulError) {
            console.error('❌ [B2][DEBUG] Error in ZulAssistant:', zulError);
            await sendWhatsAppMessage(message.from, 
              'Ops! Tive um problema aqui. 😅\n\nTenta de novo? Se continuar, melhor falar com o suporte!'
            );
          }
        }
      }
    }

    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 [B1] Message status: ${status.status} for ${status.id}`);
      }
    }

  } catch (error) {
    console.error('❌ [B1] Error processing webhook:', error);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'fintrack_verify_token') {
      return res.status(200).send(challenge);
    }
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      await processWebhook(req.body);
      return res.status(200).send('OK');
    } catch (error) {
      return res.status(500).send('Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
```

---

### backend/services/zulAssistant.js

**⚠️ Arquivo muito grande (1884 linhas)** - Ver arquivo original completo em: `backend/services/zulAssistant.js`

**Principais métodos:**
- `normalizeText(str)` - Linhas 34-41
- `extractCoreDescription(text)` - Linhas 46-82
- `pickVariation(variations, seed)` - Linhas 88-98
- `getFirstName(context)` - Linhas 103-106
- `context.saveExpense(args)` - Linhas 510-1160 (função completa de salvamento)
- `sendConversationalMessage()` - Linhas 506-1273
- `getConversationalInstructions(context)` - Linhas 1404-1609 (prompt do GPT)
- `getFunctions()` - Linhas 1614-1655
- `handleFunctionCall()` - Linhas 1810-1827
- `processMessage()` - Linhas 1832-1871

---

### backend/services/whatsapp.js

```javascript
import axios from 'axios';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Enviar mensagem de texto via WhatsApp
 */
export async function sendTextMessage(phoneNumberId, to, message) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Processar resposta de botão do WhatsApp
 */
export function parseButtonReply(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;
    
    if (!messages || messages.length === 0) {
      return null;
    }

    const message = messages[0];
    const buttonReply = message.interactive?.button_reply;
    
    if (buttonReply) {
      return {
        messageId: message.id,
        from: message.from,
        buttonId: buttonReply.id,
        buttonTitle: buttonReply.title,
        timestamp: message.timestamp
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao processar resposta de botão:', error);
    return null;
  }
}
```

---

### backend/routes/whatsapp.js

```javascript
import express from 'express';
import { parseButtonReply, sendTextMessage } from '../services/whatsapp.js';
import { updateExpenseOwner } from '../services/supabase.js';

const router = express.Router();

/**
 * GET /webhook
 * Verify webhook for WhatsApp
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fintrack_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * Receive WhatsApp button responses and update expense owner
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    
    // Quickly respond to WhatsApp to avoid timeout
    res.sendStatus(200);
    
    // Parse button reply
    const reply = parseButtonReply(body);
    
    if (reply) {
      const { expenseId, owner, split } = reply;
      
      // Update expense in Supabase
      await updateExpenseOwner(expenseId, owner, split);
      
      // Send confirmation message
      await sendTextMessage(
        `✅ Despesa atribuída a: ${owner}${split ? ' (compartilhado)' : ''}`
      );
      
      console.log(`Updated expense ${expenseId} - Owner: ${owner}, Split: ${split}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

export default router;
```

---

## 🔄 FLUXO COMPLETO

```
WhatsApp Webhook (Facebook)
    ↓
backend/api/webhook.js
    ├─ getUserByPhone() - Busca usuário no Supabase
    ├─ Busca cartões disponíveis da organização
    └─ Chama zul.processMessage()
         ↓
backend/services/zulAssistant.js
    ├─ processMessage() - Detecta se é WhatsApp ou Web
    ├─ sendConversationalMessage() - Converte com GPT-4o-mini
    │   ├─ getConversationalInstructions() - Prompt do GPT (1400+ linhas)
    │   ├─ Carrega histórico da conversa do banco
    │   ├─ Chama GPT com function calling
    │   └─ Salva no histórico
    ├─ handleFunctionCall() - Processa chamadas de funções
    │   └─ save_expense (context.saveExpense)
    │       ├─ Normaliza payment_method
    │       ├─ Busca cost_center_id (primeiro nome suportado)
    │       ├─ Inferência automática de categoria (catHints + synonyms)
    │       ├─ Validação obrigatória de categoria
    │       ├─ Subfluxo de cartão de crédito
    │       ├─ Criação de parcelas futuras
    │       └─ Mensagem de confirmação formatada
    └─ Retorna resposta
         ↓
backend/api/webhook.js
    └─ sendWhatsAppMessage() - Envia resposta via WhatsApp API
```

---

## 📊 ESTRUTURA DE DADOS

### Tabelas do Banco (Supabase):
- `expenses` - Despesas registradas
- `budget_categories` - Categorias (org + globais)
- `cost_centers` - Centros de custo (responsáveis)
- `cards` - Cartões de crédito da organização
- `conversation_state` - Estado das conversas (histórico)

### Variáveis de Ambiente Necessárias:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_ID` (opcional, cria dinamicamente se não existir)
- `WHATSAPP_TOKEN`
- `PHONE_ID`

---

## ⚠️ OBSERVAÇÕES

1. **zulAssistant.js** é o arquivo principal (1884 linhas) - contém toda a lógica
2. **webhook.js** é o ponto de entrada - recebe mensagens do WhatsApp
3. **smartConversation.js** está desabilitado (não usado no fluxo atual)
4. **zulMessages.js** não é usado no fluxo "puro" (GPT gera mensagens)

---

## 📌 PRÓXIMOS PASSOS

Para ver os códigos completos:
1. **webhook.js**: Ver arquivo acima
2. **zulAssistant.js**: Ver arquivo original em `backend/services/zulAssistant.js` (1884 linhas)
3. **whatsapp.js**: Ver arquivo acima
4. **routes/whatsapp.js**: Ver arquivo acima

