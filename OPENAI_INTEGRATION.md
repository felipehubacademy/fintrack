# 🤖 INTEGRAÇÃO OPENAI + WHATSAPP

## 🎯 BENEFÍCIOS

### 1. **Interpretação Inteligente de Texto**
```
Usuário: "gati 20 nu mercado"
OpenAI: Interpreta como "Gastei 20 no mercado"
Bot: "Você gastou R$ 20,00 no mercado, correto?" [Sim] [Não]
```

### 2. **Transcrição de Áudio**
```
Usuário: 🎤 "Gastei cinquenta reais no posto de gasolina hoje"
Whisper API: Transcreve para texto
GPT-4: Extrai valor + descrição + categoria
Bot: "Entendi: R$ 50,00 em Combustível, correto?"
```

### 3. **Conversação Natural**
```
Usuário: "paguei a conta de luz"
GPT-4: Entende que falta o valor
Bot: "Quanto você pagou na conta de luz?"
Usuário: "150"
Bot: "R$ 150,00 em Contas/Utilidades, cartão ou a vista?"
```

### 4. **Múltiplas Despesas de Uma Vez**
```
Usuário: "Hoje gastei 50 no mercado, 80 no posto e 30 no restaurante"
GPT-4: Identifica 3 despesas separadas
Bot: "Entendi 3 despesas:
1. R$ 50 - Mercado
2. R$ 80 - Posto
3. R$ 30 - Restaurante
Vou registrar uma por vez, ok?"
```

### 5. **📸 OCR de Comprovantes (GPT-4 Vision)** ⭐ NOVO!
```
Usuário: 📷 [Foto de nota fiscal]
GPT-4 Vision: Lê a imagem
  ✅ Valor: R$ 147,50
  ✅ Estabelecimento: "Supermercado Pão de Açúcar"
  ✅ Data: 10/10/2025
  ✅ Categoria: Supermercado
Bot: "Vi seu comprovante! 
R$ 147,50 no Pão de Açúcar em 10/10/2025
Categoria: Supermercado

Cartão ou a vista?"
```

**CASOS DE USO:**
- 📄 Nota fiscal
- 🧾 Cupom fiscal
- 💳 Comprovante de cartão
- 📱 Screenshot de pedido (iFood, Uber)
- 🎫 Recibo de estacionamento

---

## 🏗️ ARQUITETURA

```
WhatsApp Message
    ↓
Webhook recebe (texto ou áudio)
    ↓
┌──────────────────────────────────┐
│  OpenAI Service                  │
├──────────────────────────────────┤
│  1. Se áudio:                    │
│     → Whisper API (transcrição)  │
│                                   │
│  2. GPT-4 Mini:                  │
│     → Extrair intent             │
│     → Extrair valor/descrição    │
│     → Corrigir erros de digitação│
│     → Gerar confirmação          │
└──────────────────────────────────┘
    ↓
Fluxo conversacional atual
    ↓
Salvar no Supabase
```

---

## 💻 IMPLEMENTAÇÃO

### 1. Service: `openaiService.js`

```javascript
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class OpenAIService {
  
  /**
   * 📸 Analisar imagem de comprovante (GPT-4 Vision)
   */
  async analyzeReceipt(imageUrl) {
    try {
      // Download da imagem do WhatsApp
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
        }
      });
      const imageBase64 = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBase64).toString('base64');
      
      const prompt = `Analise esta imagem de comprovante/nota fiscal e extraia:
1. Valor total (em R$)
2. Nome do estabelecimento
3. Data da compra (se visível)
4. Categoria mais provável (Alimentação, Combustível, Supermercado, Transporte, Saúde, Beleza, Lazer, Contas, Outros)
5. Itens principais (se for nota fiscal detalhada)

Se não conseguir ler alguma informação, coloque null.

Retorne APENAS um JSON válido:
{
  "valor": 147.50,
  "estabelecimento": "Supermercado Pão de Açúcar",
  "data": "2025-10-10",
  "categoria": "Supermercado",
  "itens": ["Arroz", "Feijão", "Carne"],
  "confianca": 0.95,
  "tipo_documento": "Nota Fiscal" // ou "Cupom", "Recibo", "Screenshot"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // GPT-4o tem Vision
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high' // Alta qualidade para OCR
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(completion.choices[0].message.content);
      
      return {
        amount: result.valor,
        description: result.estabelecimento,
        date: result.data,
        category: result.categoria,
        items: result.itens,
        confidence: result.confianca,
        documentType: result.tipo_documento,
        needsConfirmation: result.confianca < 0.8
      };
      
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      throw error;
    }
  }
  
  /**
   * Transcrever áudio do WhatsApp
   */
  async transcribeAudio(audioUrl) {
    try {
      // Download do áudio
      const audioResponse = await fetch(audioUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
        }
      });
      const audioBuffer = await audioResponse.arrayBuffer();
      
      // Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioBuffer,
        model: 'whisper-1',
        language: 'pt',
      });
      
      return transcription.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }
  
  /**
   * Interpretar mensagem de despesa usando GPT-4
   */
  async interpretExpense(userMessage) {
    const prompt = `Você é um assistente financeiro. Analise a mensagem do usuário e extraia:
1. Valor gasto (em R$)
2. Descrição/local da despesa
3. Categoria (Alimentação, Combustível, Supermercado, Transporte, Saúde, Beleza, Lazer, Contas, Outros)

Se houver erros de digitação, corrija automaticamente.
Se o valor não estiver claro, retorne null.

Retorne APENAS um JSON válido neste formato:
{
  "valor": 50.00,
  "descricao": "mercado",
  "categoria": "Supermercado",
  "confianca": 0.95,
  "mensagem_original_corrigida": "Gastei 50 no mercado"
}

Mensagem do usuário: "${userMessage}"`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Mais barato e rápido
        messages: [
          { role: 'system', content: 'Você é um assistente financeiro especializado em entender despesas em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Baixa criatividade, mais preciso
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(completion.choices[0].message.content);
      
      return {
        amount: result.valor,
        description: result.descricao,
        category: result.categoria,
        confidence: result.confianca,
        correctedMessage: result.mensagem_original_corrigida,
        needsConfirmation: result.confianca < 0.8
      };
      
    } catch (error) {
      console.error('Error interpreting expense with GPT:', error);
      throw error;
    }
  }
  
  /**
   * Gerar mensagem de confirmação amigável
   */
  async generateConfirmation(expense) {
    const prompt = `Gere uma mensagem de confirmação amigável e concisa para:
Valor: R$ ${expense.amount}
Descrição: ${expense.description}
Categoria: ${expense.category}

Use emojis relevantes. Seja informal e brasileiro.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 100
      });
      
      return completion.choices[0].message.content;
      
    } catch (error) {
      console.error('Error generating confirmation:', error);
      // Fallback
      return `Entendi! R$ ${expense.amount} em ${expense.category} (${expense.description})`;
    }
  }
  
  /**
   * Detectar múltiplas despesas em uma mensagem
   */
  async detectMultipleExpenses(userMessage) {
    const prompt = `Analise se a mensagem contém MÚLTIPLAS despesas diferentes.
Se sim, separe cada uma com valor, descrição e categoria.

Retorne JSON:
{
  "multiplas": true/false,
  "despesas": [
    { "valor": 50, "descricao": "mercado", "categoria": "Supermercado" },
    { "valor": 80, "descricao": "posto", "categoria": "Combustível" }
  ]
}

Mensagem: "${userMessage}"`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      return JSON.parse(completion.choices[0].message.content);
      
    } catch (error) {
      console.error('Error detecting multiple expenses:', error);
      return { multiplas: false, despesas: [] };
    }
  }
}

export default OpenAIService;
```

### 2. Atualizar `whatsappConversation.js`

```javascript
import OpenAIService from './openaiService.js';

class WhatsAppConversation {
  constructor() {
    this.openai = new OpenAIService();
  }
  
  async handleIncomingMessage(message) {
    const text = message.text?.body;
    const audio = message.audio;
    const from = message.from;
    
    let processedText = text;
    
    // 1. Se for áudio, transcrever
    if (audio) {
      console.log('🎤 Audio message detected, transcribing...');
      processedText = await this.openai.transcribeAudio(audio.id);
      console.log(`✅ Transcription: ${processedText}`);
    }
    
    // 2. Buscar estado da conversa
    const state = await this.getConversationState(from);
    
    if (!state) {
      // Nova conversa - usar OpenAI para interpretar
      
      // Checar múltiplas despesas
      const multiCheck = await this.openai.detectMultipleExpenses(processedText);
      
      if (multiCheck.multiplas) {
        await this.handleMultipleExpenses(from, multiCheck.despesas);
        return;
      }
      
      // Interpretar despesa única
      const expense = await this.openai.interpretExpense(processedText);
      
      if (expense.amount) {
        // Se confiança baixa, pedir confirmação
        if (expense.needsConfirmation) {
          await this.sendConfirmationRequest(from, expense);
          await this.saveState(from, 'awaiting_expense_confirmation', expense);
        } else {
          // Prosseguir normalmente
          await this.saveState(from, 'awaiting_payment_method', expense);
          await this.sendPaymentMethodTemplate(from, expense);
        }
      } else {
        await this.sendHelpMessage(from);
      }
      
    } else if (state.state === 'awaiting_expense_confirmation') {
      // Confirmar se entendeu corretamente
      if (text.toLowerCase().includes('sim') || text === '1') {
        await this.saveState(from, 'awaiting_payment_method', state.temp_data);
        await this.sendPaymentMethodTemplate(from, state.temp_data);
      } else {
        await this.clearState(from);
        await this.sendHelpMessage(from);
      }
      
    } else {
      // Continuar fluxo normal (payment_method, owner, etc)
      // ... código existente ...
    }
  }
  
  async sendConfirmationRequest(userPhone, expense) {
    const message = await this.openai.generateConfirmation(expense);
    
    // Adicionar botões de confirmação
    const fullMessage = `${message}\n\nEstá correto?\n1️⃣ Sim\n2️⃣ Não, tentar novamente`;
    
    // Enviar mensagem...
  }
  
  async handleMultipleExpenses(userPhone, expenses) {
    const message = `Entendi ${expenses.length} despesas:\n\n` +
      expenses.map((e, i) => `${i + 1}. R$ ${e.valor} - ${e.descricao}`).join('\n') +
      `\n\nVou registrar uma por vez, ok? 😊`;
    
    // Salvar todas no estado
    await this.saveState(userPhone, 'processing_multiple', {
      expenses,
      currentIndex: 0
    });
    
    // Enviar primeira
    await this.sendPaymentMethodTemplate(userPhone, expenses[0]);
  }
}
```

---

## 💰 CUSTOS ESTIMADOS

### OpenAI Pricing (Out 2024)

**GPT-4o Mini (Texto):**
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- ~500 tokens por interpretação
- **Custo: ~$0.0004 por mensagem** (R$ 0,002)

**GPT-4o (Vision - Imagens):**
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- ~1000 tokens por imagem (alta qualidade)
- **Custo: ~$0.0125 por imagem** (R$ 0,06)

**Whisper API (Áudio):**
- $0.006 / minuto de áudio
- Áudio médio: 10 segundos
- **Custo: ~$0.001 por áudio** (R$ 0,005)

**Estimativa mensal (100 mensagens):**
- 60 textos: R$ 0,12
- 20 áudios: R$ 0,10
- 20 imagens: R$ 1,20
- **Total: R$ 1,42/mês** 🎉 (Ainda super barato!)

---

## 🚀 IMPLEMENTAÇÃO (3 NÍVEIS)

### Nível 1: BÁSICO (Recomendado começar)
✅ Interpretação de texto com GPT-4 Mini
✅ Correção de erros de digitação
✅ Confirmação inteligente

### Nível 2: INTERMEDIÁRIO
✅ Nível 1 +
✅ Transcrição de áudio (Whisper)
✅ OCR de comprovantes (GPT-4 Vision) 📸
✅ Múltiplas despesas

### Nível 3: AVANÇADO
✅ Nível 2 +
✅ Aprendizado de padrões do usuário
✅ Sugestões proativas
✅ Análise de gastos com insights

---

## 🎯 PRÓXIMO PASSO

Quer que eu implemente o **Nível 1** agora?
- Apenas GPT-4 Mini para texto
- Correção automática
- Confirmação inteligente
- Custo: ~R$ 0,002 por mensagem

Sim ou não? 🚀

