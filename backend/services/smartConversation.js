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
 * Conversa inteligente para FinTrack V2
 * Analisa mensagens e extrai informações automaticamente
 */
class SmartConversation {
  constructor() {
    this.openai = new OpenAIService();
  }

  /**
   * Analisar mensagem e extrair informações da despesa
   */
  async analyzeExpenseMessage(text, userPhone) {
    try {
      console.log(`🧠 Analisando mensagem: "${text}"`);
      
      const prompt = `Analise a seguinte mensagem sobre uma despesa e extraia as informações disponíveis.
      
      INFORMAÇÕES A EXTRAIR:
      - valor: número em reais (ex: 50.00, 150.50)
      - descricao: o que foi comprado/onde
      - categoria: Alimentação, Transporte, Saúde, Lazer, Contas, Casa, Educação, Investimentos, Outros
      - metodo_pagamento: credit_card, debit_card, pix, cash, other
      - responsavel: nome da pessoa (Felipe, Letícia, João, Maria, etc.) ou "compartilhado"
      - data: data da compra (hoje, ontem, ou data específica)
      - confianca: nível de confiança (0.0 a 1.0)
      - precisa_confirmar: true se alguma informação crucial estiver faltando
      
      EXEMPLOS:
      "Gastei 50 no mercado no débito" → {valor: 50, descricao: "mercado", categoria: "Alimentação", metodo_pagamento: "debit_card", responsavel: null, data: "hoje", confianca: 0.9, precisa_confirmar: true}
      
      "Gastei 50 no mercado no débito para o Felipe" → {valor: 50, descricao: "mercado", categoria: "Alimentação", metodo_pagamento: "debit_card", responsavel: "Felipe", data: "hoje", confianca: 0.95, precisa_confirmar: false}
      
      "Paguei 30 na farmácia ontem" → {valor: 30, descricao: "farmácia", categoria: "Saúde", metodo_pagamento: null, responsavel: null, data: "ontem", confianca: 0.8, precisa_confirmar: true}
      
      Retorne APENAS um JSON válido:`;

      const completion = await this.openai.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      console.log(`✅ Análise concluída:`, result);
      return result;

    } catch (error) {
      console.error('❌ Erro na análise:', error);
      return null;
    }
  }

  /**
   * Buscar usuário por telefone
   */
  async getUserByPhone(phone) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(*),
          cost_centers:cost_centers(*)
        `)
        .eq('phone', phone)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      return null;
    }
  }

  /**
   * Buscar centros de custo da organização
   */
  async getCostCenters(organizationId) {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar centros de custo:', error);
      return [];
    }
  }

  /**
   * Buscar categorias de orçamento
   */
  async getBudgetCategories(organizationId) {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      return [];
    }
  }

  /**
   * Enviar mensagem WhatsApp
   */
  async sendWhatsAppMessage(to, text) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const message = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: text,
      },
    };

    try {
      await axios.post(`${WHATSAPP_API_URL}/${phoneId}/messages`, message, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 7000,
      });
      console.log(`✅ Mensagem enviada para ${to}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error.message);
    }
  }

  /**
   * Enviar mensagem conversacional (sem botões)
   */
  async sendConversationalMessage(to, text) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const message = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: text,
      },
    };

    try {
      await axios.post(`${WHATSAPP_API_URL}/${phoneId}/messages`, message, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 7000,
      });
      console.log(`✅ Mensagem conversacional enviada para ${to}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error.message);
    }
  }

  /**
   * Salvar despesa no banco
   */
  async saveExpense(expenseData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao salvar despesa:', error);
      throw error;
    }
  }

  /**
   * Processar mensagem principal
   */
  async handleMessage(text, userPhone) {
    try {
      console.log(`📱 Processando mensagem de ${userPhone}: "${text}"`);

      // 1. Buscar usuário
      const user = await this.getUserByPhone(userPhone);
      if (!user) {
        await this.sendWhatsAppMessage(userPhone, 
          "❌ Usuário não encontrado. Entre em contato com o administrador da organização."
        );
        return;
      }

      // 2. Analisar mensagem
      const analysis = await this.analyzeExpenseMessage(text, userPhone);
      if (!analysis) {
        await this.sendWhatsAppMessage(userPhone, 
          "❌ Não consegui entender sua mensagem. Tente: 'Gastei 50 no mercado'"
        );
        return;
      }

      // 3. Verificar se precisa de confirmação
      if (analysis.precisa_confirmar) {
        await this.handleIncompleteInfo(user, analysis);
      } else {
        await this.handleCompleteInfo(user, analysis);
      }

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      await this.sendWhatsAppMessage(userPhone, 
        "❌ Ocorreu um erro. Tente novamente em alguns minutos."
      );
    }
  }

  /**
   * Lidar com informação incompleta
   */
  async handleIncompleteInfo(user, analysis) {
    const costCenters = await this.getCostCenters(user.organization_id);
    const costCenterNames = costCenters.map(cc => cc.name);

    let message = `💰 R$ ${analysis.valor.toFixed(2)} - ${analysis.descricao} (${analysis.categoria})`;
    
    // Perguntar o que está faltando de forma conversacional
    const missingInfo = [];
    if (!analysis.metodo_pagamento) missingInfo.push('método de pagamento');
    if (!analysis.responsavel) missingInfo.push('responsável');

    if (missingInfo.length > 0) {
      message += `\n\nPreciso saber: ${missingInfo.join(' e ')}`;
      
      if (!analysis.metodo_pagamento) {
        message += `\n\nMétodo de pagamento: Débito, Crédito, PIX ou Dinheiro?`;
      } else if (!analysis.responsavel) {
        message += `\n\nResponsável: ${costCenterNames.join(', ')} ou Compartilhado?`;
      }
      
      await this.sendConversationalMessage(user.phone, message);
    }
  }

  /**
   * Lidar com informação completa
   */
  async handleCompleteInfo(user, analysis) {
    const costCenters = await this.getCostCenters(user.organization_id);
    const costCenter = costCenters.find(cc => 
      cc.name.toLowerCase() === analysis.responsavel?.toLowerCase()
    );

    if (!costCenter) {
      await this.sendWhatsAppMessage(user.phone, 
        `❌ Centro de custo "${analysis.responsavel}" não encontrado. Contate o administrador.`
      );
      return;
    }

    // Salvar despesa
    const expenseData = {
      organization_id: user.organization_id,
      user_id: user.id,
      cost_center_id: costCenter.id,
      amount: analysis.valor,
      description: analysis.descricao,
      payment_method: analysis.metodo_pagamento,
      date: this.parseDate(analysis.data),
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
      whatsapp_message_id: `msg_${Date.now()}`
    };

    await this.saveExpense(expenseData);

    // Enviar confirmação
    const confirmationMessage = `✅ Despesa registrada!\n\n` +
      `💰 R$ ${analysis.valor.toFixed(2)} - ${analysis.descricao}\n` +
      `📂 ${analysis.categoria} - ${analysis.responsavel}\n` +
      `💳 ${this.getPaymentMethodName(analysis.metodo_pagamento)}\n` +
      `📅 ${this.parseDate(analysis.data).toLocaleDateString('pt-BR')}`;

    await this.sendWhatsAppMessage(user.phone, confirmationMessage);
  }

  /**
   * Converter data
   */
  parseDate(dateStr) {
    const today = new Date();
    
    if (dateStr === 'hoje') return today;
    if (dateStr === 'ontem') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    
    // Tentar parsear data específica
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? today : parsed;
  }

  /**
   * Nome do método de pagamento
   */
  getPaymentMethodName(method) {
    const names = {
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'pix': 'PIX',
      'cash': 'Dinheiro',
      'other': 'Outro'
    };
    return names[method] || method;
  }
}

export default SmartConversation;
