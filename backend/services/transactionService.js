import { createClient } from '@supabase/supabase-js';

class TransactionService {
  constructor() {
    // Inicializar Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios!');
      throw new Error('Supabase credentials not configured');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ TransactionService: Supabase initialized');
  }
  /**
   * Salva transação inicial com status pending
   */
  async saveTransaction(transaction) {
    try {
      const { data, error } = await this.supabase
        .from('expenses')
        .insert({
          pluggy_transaction_id: transaction.id,
          date: transaction.date,
          description: transaction.description,
          amount: Math.abs(transaction.amount),
          category: transaction.category,
          source: 'pluggy',
          status: 'pending',
          whatsapp_message_id: transaction.whatsapp_message_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Transação salva:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Erro ao salvar transação:', error);
      throw error;
    }
  }

  /**
   * Atualiza transação com owner (Felipe/Leticia/Compartilhado)
   */
  async confirmTransaction(pluggyTransactionId, owner, whatsappMessageId) {
    try {
      const { data, error } = await this.supabase
        .from('expenses')
        .update({
          owner: owner,
          split: owner === 'Compartilhado',
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('pluggy_transaction_id', pluggyTransactionId)
        .eq('whatsapp_message_id', whatsappMessageId)
        .select()
        .single();

      if (error) throw error;
      
      console.log(`✅ Transação confirmada para ${owner}:`, data.id);
      return data;
    } catch (error) {
      console.error('❌ Erro ao confirmar transação:', error);
      throw error;
    }
  }

  /**
   * Marca transação como ignorada
   */
  async ignoreTransaction(pluggyTransactionId, whatsappMessageId) {
    try {
      const { data, error } = await this.supabase
        .from('expenses')
        .update({
          status: 'ignored',
          confirmed_at: new Date().toISOString(),
        })
        .eq('pluggy_transaction_id', pluggyTransactionId)
        .eq('whatsapp_message_id', whatsappMessageId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Transação ignorada:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Erro ao ignorar transação:', error);
      throw error;
    }
  }

  /**
   * Busca totais do mês para um owner
   */
  async getMonthlyTotal(owner, month = new Date()) {
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const { data, error } = await this.supabase
        .from('expenses')
        .select('amount, owner')
        .eq('status', 'confirmed')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]);

      if (error) throw error;

      // Calcular total individual
      let individualTotal = 0;
      let sharedTotal = 0;
      let ownTotal = 0;

      data.forEach(expense => {
        if (expense.owner === 'Compartilhado') {
          sharedTotal += parseFloat(expense.amount);
        } else if (expense.owner === owner) {
          ownTotal += parseFloat(expense.amount);
        }
      });

      // Total individual = gastos próprios + 50% dos compartilhados
      individualTotal = ownTotal + (sharedTotal / 2);

      return {
        owner,
        month: startOfMonth.toISOString().split('T')[0],
        individualTotal: individualTotal.toFixed(2),
        ownTotal: ownTotal.toFixed(2),
        sharedTotal: sharedTotal.toFixed(2),
        sharedIndividual: (sharedTotal / 2).toFixed(2),
        totalTransactions: data.filter(e => e.owner === owner || e.owner === 'Compartilhado').length,
      };
    } catch (error) {
      console.error('❌ Erro ao buscar total mensal:', error);
      throw error;
    }
  }

  /**
   * Busca transação por WhatsApp Message ID
   */
  async getTransactionByWhatsAppId(whatsappMessageId) {
    try {
      console.log(`🔍 Buscando transação com Message ID: ${whatsappMessageId}`);
      console.log(`🔌 Supabase client exists: ${!!this.supabase}`);
      
      if (!this.supabase) {
        console.error('❌ SUPABASE CLIENT IS NULL!');
        return null;
      }
      
      console.log('📡 Fazendo query no Supabase...');
      
      const { data, error } = await this.supabase
        .from('expenses')
        .select('*')
        .eq('whatsapp_message_id', whatsappMessageId)
        .single();
      
      console.log('📥 Query concluída!');

      if (error) {
        console.error('❌ Erro Supabase:', error);
        throw error;
      }
      
      if (data) {
        console.log(`✅ Transação encontrada: ID ${data.id}, Descrição: ${data.description}`);
      } else {
        console.log('⚠️ Nenhuma transação encontrada');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar transação:', error.message);
      console.error('Stack:', error.stack);
      return null;
    }
  }
}

export default TransactionService;

