import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAIService from './openaiService.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Gerenciamento de conversas WhatsApp para lançamento de despesas
 */
class WhatsAppConversation {
  constructor() {
    this.openai = new OpenAIService();
  }
  
  /**
   * Parse mensagem de entrada para extrair despesa (usando OpenAI)
   * Ex: "Gastei 300,50 no posto de gasolina" ou "gati 20 nu mercado"
   */
  async parseExpenseInput(text) {
    try {
      return await this.openai.interpretExpense(text);
    } catch (error) {
      console.error('Error parsing expense with AI:', error);
      return null;
    }
  }

  /**
   * Categorizar despesa baseado em keywords
   */
  categorize(description) {
    const keywords = {
      'Combustível': ['posto', 'gasolina', 'alcool', 'etanol', 'shell', 'ipiranga', 'petrobras'],
      'Alimentação': ['restaurante', 'lanche', 'pizza', 'comida', 'bar', 'padaria', 'ifood'],
      'Supermercado': ['mercado', 'extra', 'carrefour', 'pao de acucar', 'assai'],
      'Transporte': ['uber', 'taxi', '99', 'onibus', 'metro', 'estacionamento'],
      'Saúde': ['farmacia', 'drogasil', 'medico', 'clinica', 'hospital'],
      'Beleza': ['salao', 'cabelo', 'manicure', 'barbearia'],
      'Lazer': ['cinema', 'show', 'teatro', 'parque'],
    };

    const lowerDesc = description.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(w => lowerDesc.includes(w))) {
        return category;
      }
    }

    return 'Outros';
  }

  /**
   * Buscar estado da conversa
   */
  async getConversationState(userPhone) {
    const { data, error } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('user_phone', userPhone)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching conversation state:', error);
    }

    return data;
  }

  /**
   * Salvar estado da conversa
   */
  async saveState(userPhone, state, tempData) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { data, error } = await supabase
      .from('conversation_state')
      .upsert({
        user_phone: userPhone,
        state,
        temp_data: tempData,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_phone'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving conversation state:', error);
      throw error;
    }

    return data;
  }

  /**
   * Limpar estado da conversa
   */
  async clearState(userPhone) {
    await supabase
      .from('conversation_state')
      .delete()
      .eq('user_phone', userPhone);
  }

  /**
   * Enviar template de escolha de método de pagamento
   */
  async sendPaymentMethodTemplate(userPhone, expense) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'text', // Por enquanto texto simples, depois criaremos o template
      text: {
        body: `Certo, você gastou R$ ${expense.amount.toFixed(2)} em ${expense.category}.\n\nEsse gasto foi em:\n1️⃣ Cartão de crédito\n2️⃣ A vista (débito/pix/dinheiro)\n\nResponda com 1 ou 2.`
      }
    };

    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${phoneId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending payment method message:', error.message);
      throw error;
    }
  }

  /**
   * Enviar template de escolha de responsável
   */
  async sendOwnerTemplate(userPhone, expense) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const paymentLabel = expense.payment_method === 'credit_card' 
      ? 'Cartão de crédito' 
      : 'A vista';

    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'text',
      text: {
        body: `Entendi, R$ ${expense.amount.toFixed(2)} em ${expense.category} - ${paymentLabel}.\n\nQuem é responsável por esse gasto?\n1️⃣ Felipe\n2️⃣ Letícia\n3️⃣ Compartilhado\n\nResponda com 1, 2 ou 3.`
      }
    };

    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${phoneId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending owner message:', error.message);
      throw error;
    }
  }

  /**
   * Enviar confirmação final
   */
  async sendConfirmation(userPhone, expense, monthlyTotals) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const paymentLabel = expense.payment_method === 'credit_card' 
      ? 'Cartão de crédito' 
      : 'A vista';

    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'text',
      text: {
        body: `✅ *Despesa Confirmada*\n\nValor: R$ ${expense.amount.toFixed(2)}\nCategoria: ${expense.category}\nForma: ${paymentLabel}\nResponsável: ${expense.owner}\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n*Totais do mês:*\nCartão de Crédito: R$ ${monthlyTotals.card_total.toFixed(2)}\nA Vista: R$ ${monthlyTotals.general_total.toFixed(2)}\n*TOTAL: R$ ${monthlyTotals.grand_total.toFixed(2)}*\n\n_FinTrack - Controle Financeiro_`
      }
    };

    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${phoneId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending confirmation:', error.message);
      throw error;
    }
  }

  /**
   * Parse resposta do usuário (método de pagamento)
   */
  parsePaymentMethod(text) {
    const lower = text.toLowerCase().trim();
    
    if (lower === '1' || lower.includes('cartao') || lower.includes('cartão') || lower.includes('credito') || lower.includes('crédito')) {
      return 'credit_card';
    }
    
    if (lower === '2' || lower.includes('vista') || lower.includes('debito') || lower.includes('pix') || lower.includes('dinheiro')) {
      return 'cash';
    }

    return null;
  }

  /**
   * Parse resposta do usuário (responsável)
   */
  parseOwner(text) {
    const lower = text.toLowerCase().trim();
    
    if (lower === '1' || lower.includes('felipe')) {
      return 'Felipe';
    }
    
    if (lower === '2' || lower.includes('leticia') || lower.includes('letícia')) {
      return 'Leticia';
    }
    
    if (lower === '3' || lower.includes('compartilhado') || lower.includes('ambos') || lower.includes('dois')) {
      return 'Compartilhado';
    }

    return null;
  }

  /**
   * Salvar despesa no Supabase
   */
  async saveGeneralExpense(expense) {
    const { data, error } = await supabase
      .from('expenses_general')
      .insert({
        date: expense.date || new Date().toISOString().split('T')[0],
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        owner: expense.owner,
        payment_method: expense.payment_method,
        status: 'confirmed',
        split: expense.owner === 'Compartilhado',
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving expense:', error);
      throw error;
    }

    return data;
  }

  /**
   * Buscar totais do mês
   */
  async getMonthlyTotals() {
    const month = new Date().toISOString().slice(0, 7);
    
    const { data, error } = await supabase.rpc('get_monthly_summary', {
      target_month: `${month}-01`,
    });

    if (error) throw error;

    return data[0] || {
      card_total: 0,
      general_total: 0,
      grand_total: 0,
    };
  }

  /**
   * Processar mensagem recebida (função principal)
   * Suporta: Texto, Áudio (Whisper), Imagem (Vision)
   */
  async handleIncomingMessage(message) {
    const text = message.text?.body;
    const audio = message.audio;
    const image = message.image;
    const from = message.from;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    let processedText = text;
    let expense = null;

    // 1. Se for ÁUDIO, transcrever primeiro
    if (audio) {
      console.log('🎤 Audio message detected, transcribing...');
      try {
        // Buscar URL do áudio no WhatsApp
        const mediaResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${audio.id}`,
          { headers: { 'Authorization': `Bearer ${whatsappToken}` } }
        );
        const audioUrl = mediaResponse.data.url;
        
        processedText = await this.openai.transcribeAudio(audioUrl, whatsappToken);
        console.log(`✅ Transcription: ${processedText}`);
      } catch (error) {
        console.error('Error transcribing audio:', error);
        await this.sendHelpMessage(from);
        return;
      }
    }
    
    // 2. Se for IMAGEM, analisar comprovante
    if (image) {
      console.log('📸 Image message detected, analyzing receipt...');
      try {
        // Buscar URL da imagem no WhatsApp
        const mediaResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${image.id}`,
          { headers: { 'Authorization': `Bearer ${whatsappToken}` } }
        );
        const imageUrl = mediaResponse.data.url;
        
        expense = await this.openai.analyzeReceipt(imageUrl, whatsappToken);
        console.log(`✅ Receipt analyzed:`, expense);
      } catch (error) {
        console.error('Error analyzing image:', error);
        await this.sendHelpMessage(from);
        return;
      }
    }

    // Se não tem texto nem expense (de imagem), ignorar
    if (!processedText && !expense) return;

    console.log(`📱 Message from ${from}: ${processedText || 'image'}`);

    // Buscar estado da conversa
    const state = await this.getConversationState(from);

    if (!state) {
      // Nova conversa - tentar parsear despesa
      if (!expense && processedText) {
        expense = await this.parseExpenseInput(processedText);
      }

      if (expense) {
        console.log(`💰 Expense detected:`, expense);
        
        // Salvar estado
        await this.saveState(from, 'awaiting_payment_method', expense);
        
        // Enviar template de escolha de pagamento
        await this.sendPaymentMethodTemplate(from, expense);
      } else {
        // Mensagem não reconhecida - enviar ajuda
        await this.sendHelpMessage(from);
      }
    } else if (state.state === 'awaiting_payment_method') {
      // Processar escolha de pagamento
      const paymentMethod = this.parsePaymentMethod(text);
      
      if (paymentMethod) {
        state.temp_data.payment_method = paymentMethod;
        await this.saveState(from, 'awaiting_owner', state.temp_data);
        await this.sendOwnerTemplate(from, state.temp_data);
      } else {
        // Resposta inválida
        await this.sendPaymentMethodTemplate(from, state.temp_data);
      }
    } else if (state.state === 'awaiting_owner') {
      // Processar escolha de owner
      const owner = this.parseOwner(text);
      
      if (owner) {
        state.temp_data.owner = owner;
        
        // Salvar despesa
        await this.saveGeneralExpense(state.temp_data);
        
        // Buscar totais
        const totals = await this.getMonthlyTotals();
        
        // Enviar confirmação
        await this.sendConfirmation(from, state.temp_data, totals);
        
        // Limpar estado
        await this.clearState(from);
        
        console.log(`✅ Expense saved for ${owner}`);
      } else {
        // Resposta inválida
        await this.sendOwnerTemplate(from, state.temp_data);
      }
    }
  }

  /**
   * Enviar mensagem de ajuda
   */
  async sendHelpMessage(userPhone) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'text',
      text: {
        body: `👋 Olá! Sou o FinTrack, seu assistente financeiro.\n\nPara lançar uma despesa, envie uma mensagem como:\n• "Gastei 150 no supermercado"\n• "Paguei 80,50 no posto"\n• "300 no restaurante"\n\nVou te ajudar a categorizar e registrar! 💰`
      }
    };

    try {
      await axios.post(
        `${WHATSAPP_API_URL}/${phoneId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }
      );
    } catch (error) {
      console.error('Error sending help message:', error.message);
    }
  }
}

export default WhatsAppConversation;

