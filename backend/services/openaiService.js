import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Serviço de IA para interpretação inteligente de despesas
 * Suporta: Texto, Áudio (Whisper), Imagens (Vision)
 */
class OpenAIService {
  constructor() {
    // Expose the underlying OpenAI client so other services can use it directly
    this.client = openai;
  }
  
  /**
   * 📸 Analisar imagem de comprovante (GPT-4 Vision)
   */
  async analyzeReceipt(imageUrl, whatsappToken) {
    try {
      console.log('📸 Analyzing receipt image...');
      
      // Download da imagem do WhatsApp
      const imageResponse = await axios.get(imageUrl, {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`
        },
        responseType: 'arraybuffer'
      });
      
      const base64Image = Buffer.from(imageResponse.data).toString('base64');
      
      const prompt = `Analise esta imagem de comprovante/nota fiscal brasileira e extraia as informações:

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem comentários.

{
  "valor": 147.50,
  "estabelecimento": "Supermercado Pão de Açúcar",
  "data": "2025-10-10",
  "categoria": "Supermercado",
  "itens": ["Arroz", "Feijão", "Carne"],
  "confianca": 0.95,
  "tipo_documento": "Nota Fiscal"
}

Categorias possíveis: Alimentação, Combustível, Supermercado, Transporte, Saúde, Beleza, Lazer, Contas, Outros

Se não conseguir ler algo, use null.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      });
      
      const content = completion.choices[0].message.content;
      console.log('📄 Vision response:', content);
      
      // Parse JSON (remover markdown se houver)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      
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
      console.error('❌ Error analyzing receipt:', error.message);
      throw error;
    }
  }
  
  /**
   * 🎤 Transcrever áudio do WhatsApp (Whisper)
   */
  async transcribeAudio(audioUrl, whatsappToken) {
    const startTime = Date.now();
    try {
      console.log('🎤 [WHISPER] Iniciando transcrição de áudio...');
      console.log('🎤 [WHISPER] URL do áudio:', audioUrl);
      
      // Download do áudio
      console.log('🎤 [WHISPER] Fazendo download do áudio...');
      const downloadStart = Date.now();
      const audioResponse = await axios.get(audioUrl, {
        headers: {
          'Authorization': `Bearer ${whatsappToken}`
        },
        responseType: 'arraybuffer'
      });
      const downloadTime = Date.now() - downloadStart;
      
      const fileSize = audioResponse.data.byteLength;
      const fileSizeKB = (fileSize / 1024).toFixed(2);
      console.log(`✅ [WHISPER] Download concluído: ${fileSizeKB} KB (${downloadTime}ms)`);
      
      // Salvar temporariamente (Whisper precisa de File)
      const fs = await import('fs');
      const path = await import('path');
      const tmpPath = path.join('/tmp', `audio-${Date.now()}.ogg`);
      fs.writeFileSync(tmpPath, audioResponse.data);
      console.log('💾 [WHISPER] Arquivo temporário salvo:', tmpPath);
      
      // Whisper API
      console.log('🎤 [WHISPER] Enviando para Whisper API...');
      const whisperStart = Date.now();
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: 'whisper-1',
        language: 'pt',
      });
      const whisperTime = Date.now() - whisperStart;
      
      // Limpar arquivo temp
      fs.unlinkSync(tmpPath);
      console.log('🗑️ [WHISPER] Arquivo temporário removido');
      
      const totalTime = Date.now() - startTime;
      const transcriptionLength = transcription.text?.length || 0;
      console.log(`✅ [WHISPER] Transcrição concluída (${whisperTime}ms, total: ${totalTime}ms)`);
      console.log(`✅ [WHISPER] Texto transcrito (${transcriptionLength} caracteres): "${transcription.text}"`);
      
      return transcription.text;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ [WHISPER] Erro na transcrição:', error.message);
      console.error('❌ [WHISPER] Tempo decorrido:', `${totalTime}ms`);
      console.error('❌ [WHISPER] Stack:', error.stack);
      
      // Melhorar mensagens de erro específicas
      if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        throw new Error('Timeout ao processar áudio. Tente novamente.');
      } else if (error.message?.includes('format') || error.message?.includes('invalid')) {
        throw new Error('Formato de áudio inválido ou não suportado.');
      } else if (error.message?.includes('too short') || error.message?.includes('short')) {
        throw new Error('Áudio muito curto para transcrever.');
      }
      
      throw error;
    }
  }
  
  /**
   * 🤖 Interpretar mensagem de despesa usando GPT-4 Mini
   */
  async interpretExpense(userMessage) {
    try {
      console.log('🤖 Interpreting expense:', userMessage);
      
      const prompt = `Você é um assistente financeiro brasileiro. Analise a mensagem e extraia a despesa.

REGRAS:
1. Corrija erros de digitação automaticamente
2. Identifique valor em R$ (pode estar como "50", "50,00", "R$ 50", etc)
3. Identifique local/descrição da compra
4. Categorize (Alimentação, Combustível, Supermercado, Transporte, Saúde, Beleza, Lazer, Contas, Outros)

Exemplos:
- "gati 20 nu mercado" → 20.00, "mercado", "Supermercado"
- "Paguei 150 na conta de luz" → 150.00, "conta de luz", "Contas"
- "50 posto gasolina" → 50.00, "posto de gasolina", "Combustível"

Retorne APENAS JSON (sem markdown):
{
  "valor": 50.00,
  "descricao": "mercado",
  "categoria": "Supermercado",
  "confianca": 0.95,
  "mensagem_corrigida": "Gastei 50 no mercado"
}

Se não conseguir identificar valor, retorne null.

Mensagem: "${userMessage}"`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um assistente financeiro especializado em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      });
      
      const content = completion.choices[0].message.content;
      console.log('📄 GPT response:', content);
      
      // Parse JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      
      if (!result.valor) {
        return null;
      }
      
      return {
        amount: parseFloat(result.valor),
        description: result.descricao,
        category: result.categoria,
        confidence: result.confianca,
        correctedMessage: result.mensagem_corrigida,
        needsConfirmation: result.confianca < 0.8
      };
      
    } catch (error) {
      console.error('❌ Error interpreting expense:', error.message);
      return null;
    }
  }
  
  /**
   * 💬 Gerar mensagem de confirmação amigável
   */
  async generateConfirmation(expense) {
    try {
      const prompt = `Gere uma mensagem curta de confirmação para:
Valor: R$ ${expense.amount}
Descrição: ${expense.description}
Categoria: ${expense.category}

Use emoji relevante. Seja brasileiro e informal. Máximo 50 caracteres.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 50
      });
      
      return completion.choices[0].message.content.trim();
      
    } catch (error) {
      // Fallback
      return `R$ ${expense.amount.toFixed(2)} em ${expense.category}`;
    }
  }
  
  /**
   * 🔢 Detectar múltiplas despesas em uma mensagem
   */
  async detectMultipleExpenses(userMessage) {
    try {
      const prompt = `Analise se há MÚLTIPLAS despesas diferentes.

Retorne JSON (sem markdown):
{
  "multiplas": true,
  "despesas": [
    { "valor": 50, "descricao": "mercado", "categoria": "Supermercado" },
    { "valor": 80, "descricao": "posto", "categoria": "Combustível" }
  ]
}

Se houver apenas uma despesa, retorne: { "multiplas": false, "despesas": [] }

Mensagem: "${userMessage}"`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });
      
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      
      return result;
      
    } catch (error) {
      console.error('Error detecting multiple expenses:', error.message);
      return { multiplas: false, despesas: [] };
    }
  }
}

export default OpenAIService;

