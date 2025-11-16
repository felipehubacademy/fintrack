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
      
      // Whisper API com prompt contextual para melhor precisão
      console.log('🎤 [WHISPER] Enviando para Whisper API...');
      const whisperStart = Date.now();
      
      // Prompt contextual para melhorar precisão em português brasileiro
      // Inclui termos comuns do sistema e contexto financeiro
      const contextualPrompt = `Zul, assistente financeiro, gastos, despesas, despesa, mercado, supermercado, restaurante, lanche, pizza, ifood, delivery, padaria, açougue, peixaria, farmácia, remédio, médico, dentista, hospital, posto, gasolina, combustível, uber, taxi, ônibus, metro, estacionamento, IPVA, oficina, manutenção, aluguel, condomínio, água, luz, energia, internet, telefone, IPTU, imposto, cinema, teatro, show, balada, bar, parque, viagem, hotel, Netflix, Spotify, streaming, cabelo, barbearia, manicure, pedicure, salão, cosmético, roupa, sapato, tênis, camisa, curso, faculdade, escola, livro, petshop, ração, veterinário, paguei, pagamos, gastei, gastamos, comprei, compramos, investi, investimos, paguei, pagamos, fui, fomos, anotei, anotamos, registrei, registramos, lancei, lançamos, pix, dinheiro, dinheiro, débito, débitos, crédito, créditos, cartão, cartões, Nubank, C6, Latam, Roxinho, parcelado, parcelas, vezes, x, responsável, compartilhado, compartilhada, família, individual, eu, eu mesmo, fui eu, R$, reais, centavos, centavo, primeiro, segundo, terceiro, quarta, quinta, sexta, sétima, oitava, nona, décima, hoje, ontem, amanhã, semana, mês, ano, janeiro, fevereiro, março, abril, maio, junho, julho, agosto, setembro, outubro, novembro, dezembro, domingo, segunda, terça, quarta, quinta, sexta, sábado`;
      
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpPath),
        model: 'whisper-1',
        language: 'pt',
        prompt: contextualPrompt,
        temperature: 0.2, // Reduzir temperatura para ser mais determinístico e preciso
      });
      const whisperTime = Date.now() - whisperStart;
      
      // Limpar arquivo temp
      fs.unlinkSync(tmpPath);
      console.log('🗑️ [WHISPER] Arquivo temporário removido');
      
      const totalTime = Date.now() - startTime;
      let finalText = transcription.text;
      
      // Pós-processamento para corrigir erros comuns de transcrição em português brasileiro
      finalText = this.postProcessTranscription(finalText);
      
      const transcriptionLength = finalText?.length || 0;
      console.log(`✅ [WHISPER] Transcrição concluída (${whisperTime}ms, total: ${totalTime}ms)`);
      console.log(`✅ [WHISPER] Texto original: "${transcription.text}"`);
      console.log(`✅ [WHISPER] Texto pós-processado (${transcriptionLength} caracteres): "${finalText}"`);
      
      return finalText;
      
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
   * 🔧 Pós-processar transcrição para corrigir erros comuns
   */
  postProcessTranscription(text) {
    if (!text) return text;
    
    let processed = text;
    
    // Correções comuns de nomes e termos do sistema
    // "Zuga" -> "Zul" (erro comum do Whisper)
    processed = processed.replace(/\bZuga\b/gi, 'Zul');
    processed = processed.replace(/\bZulu\b/gi, 'Zul');
    processed = processed.replace(/\bZulh\b/gi, 'Zul');
    processed = processed.replace(/\bZews\b/gi, 'Zul'); // Outro erro comum
    processed = processed.replace(/\bZewo\b/gi, 'Zul'); // Outro erro comum
    
    // Correções para "Azul" (nome pelo qual o usuário chama o assistente)
    // Correções comuns quando o usuário fala "Azul" no início da frase
    processed = processed.replace(/\bazulão\b/gi, 'Azul');
    processed = processed.replace(/\bazulao\b/gi, 'Azul');
    // Se "azul" aparece no início da frase (com vírgula ou ponto após), provavelmente é o nome do assistente
    processed = processed.replace(/\bazul[,.]\s*/gi, 'Azul, ');
    processed = processed.replace(/^azul\s+/gi, 'Azul '); // Início da frase
    
    // Correções de números comuns que podem ser confundidos
    // Isso é mais conservador - apenas corrigir padrões muito específicos
    // "650" quando o contexto sugere "150" é difícil de detectar automaticamente
    // Então vamos deixar isso para a confirmação do usuário (já implementada)
    
    // Normalizar espaçamento
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
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

  /**
   * 📄 Parse de extrato/fatura de cartão (GPT-4 Vision)
   * @param {Array<string>} imagesBase64 - Array de imagens em base64
   * @param {Array} categories - Categorias disponíveis da organização
   * @returns {Promise<Array>} Array de transações extraídas
   */
  async parseStatementPDF(imagesBase64, categories = []) {
    try {
      console.log(`📄 [GPT-4 Vision] Analisando ${imagesBase64.length} página(s)...`);
      
      // Preparar lista de categorias para o prompt
      const categoriesText = categories.length > 0
        ? `\n\nCategorias disponíveis: ${categories.map(c => c.name).join(', ')}`
        : '';
      
      const prompt = `Analise este extrato/fatura de cartão de crédito brasileiro e extraia TODAS as transações.

REGRAS IMPORTANTES:
1. Data: YYYY-MM-DD (preservar mês original da transação)
2. Valores:
   - Compras/débitos: positivos (ex: 147.50)
   - Estornos/créditos: negativos (ex: -147.50)
   - Pagamentos parciais: negativos (ex: -2000.00)
3. Identificação:
   - is_refund: true se "ESTORNO"/"CRÉDITO"/"DEVOLUÇÃO"/"REEMBOLSO"
   - is_partial_payment: true se "PAGAMENTO"/"PAGTO FATURA"/"ANTECIPAÇÃO"
4. Categoria: OBRIGATÓRIA - sugerir baseado no estabelecimento${categoriesText}

Retorne APENAS JSON array (sem markdown, sem comentários):
[
  {
    "date": "2025-10-15",
    "description": "Supermercado Pão de Açúcar",
    "amount": 147.50,
    "is_refund": false,
    "is_partial_payment": false,
    "category_suggestion": "Alimentação"
  }
]

Extraia TODAS as transações, preservando datas originais.`;

      // Preparar mensagens com imagens
      const imageMessages = imagesBase64.map((base64) => ({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64}`,
          detail: 'high'
        }
      }));

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageMessages
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1
      });

      const content = response.choices[0].message.content.trim();
      console.log('📄 [GPT-4 Vision] Resposta recebida');
      
      // Extrair JSON da resposta (remover markdown se houver)
      let jsonText = content;
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else if (content.startsWith('[') && content.endsWith(']')) {
        jsonText = content;
      }
      
      const transactions = JSON.parse(jsonText);
      console.log(`✅ [GPT-4 Vision] ${transactions.length} transações extraídas`);
      
      return transactions;
    } catch (error) {
      console.error('❌ [GPT-4 Vision] Erro:', error);
      throw new Error(`Erro ao analisar PDF: ${error.message}`);
    }
  }

  /**
   * 🏷️ Categorizar transações usando GPT-4
   * @param {Array} transactions - Transações sem categoria
   * @param {Array} categories - Categorias disponíveis
   * @returns {Promise<Array>} Transações com category_id
   */
  async categorizeTransactions(transactions, categories) {
    try {
      console.log(`🏷️ [GPT-4] Categorizando ${transactions.length} transações...`);
      
      if (categories.length === 0) {
        console.warn('⚠️ [GPT-4] Nenhuma categoria disponível');
        return transactions.map(tx => ({ ...tx, category_id: null }));
      }
      
      // Preparar mapeamento de categorias
      const categoryMap = categories.map(c => ({
        id: c.id,
        name: c.name,
        keywords: [c.name.toLowerCase()]
      }));
      
      const prompt = `Categorize as seguintes transações brasileiras.

Categorias disponíveis:
${categoryMap.map(c => `- ${c.name} (id: ${c.id})`).join('\n')}

Transações:
${transactions.map((tx, i) => `${i + 1}. ${tx.description} - R$ ${tx.amount}`).join('\n')}

Retorne APENAS um JSON array com os IDs das categorias (mesma ordem):
["category_id_1", "category_id_2", ...]

Se não conseguir categorizar, use null.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      });

      const content = response.choices[0].message.content.trim();
      
      // Extrair JSON
      let jsonText = content;
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      const categoryIds = JSON.parse(jsonText);
      
      // Mapear category_id para cada transação
      const categorized = transactions.map((tx, i) => ({
        ...tx,
        category_id: categoryIds[i] || null
      }));
      
      console.log(`✅ [GPT-4] Transações categorizadas`);
      return categorized;
    } catch (error) {
      console.error('❌ [GPT-4] Erro ao categorizar:', error);
      // Fallback: tentar match simples por keywords
      return transactions.map(tx => {
        const desc = tx.description.toLowerCase();
        const category = categories.find(c => 
          desc.includes(c.name.toLowerCase())
        );
        return {
          ...tx,
          category_id: category?.id || null
        };
      });
    }
  }
}

export default OpenAIService;

