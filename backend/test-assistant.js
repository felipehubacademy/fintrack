import dotenv from 'dotenv';
import ZulAssistant from './services/zulAssistant.js';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testAssistant() {
  console.log('🧪 Testando ZUL Assistant localmente...\n');
  
  const assistant = new ZulAssistant();
  
  // Simular dados do usuário
  const testUserId = 'test-user-123';
  const testMessage = 'Gastei 50 no mercado';
  
  // Buscar dados reais para contexto
  const { data: costCenters } = await supabase
    .from('cost_centers')
    .select('*')
    .eq('organization_id', '092adfb3-41d8-4006-bfa5-7035338560e9')
    .eq('is_active', true);
  
  const { data: cards } = await supabase
    .from('cards')
    .select('name, id')
    .eq('organization_id', '092adfb3-41d8-4006-bfa5-7035338560e9')
    .eq('is_active', true);
  
  const { data: categories } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('organization_id', '092adfb3-41d8-4006-bfa5-7035338560e9');
  
  console.log('📊 Dados carregados:');
  console.log('- Cost Centers:', costCenters?.length || 0);
  console.log('- Cards:', cards?.length || 0);
  console.log('- Categories:', categories?.length || 0);
  console.log('');
  
  // Preparar contexto
  const context = {
    userName: 'Felipe',
    
    validatePaymentMethod: async (userInput) => {
      console.log('🔧 Function call: validate_payment_method', { userInput });
      return {
        valid: true,
        normalized_method: 'debit_card',
        available_methods: ['Débito', 'Crédito', 'PIX', 'Dinheiro']
      };
    },
    
    validateCard: async (cardName, installments, availableCards) => {
      console.log('🔧 Function call: validate_card', { cardName, installments });
      const card = cards?.find(c => c.name.toLowerCase().includes(cardName.toLowerCase()));
      return {
        valid: !!card,
        card_id: card?.id || null,
        card_name: card?.name || null,
        available_cards: cards?.map(c => c.name) || []
      };
    },
    
    validateResponsible: async (responsibleName) => {
      console.log('🔧 Function call: validate_responsible', { responsibleName });
      const found = costCenters?.find(cc => 
        cc.name.toLowerCase() === responsibleName.toLowerCase()
      );
      return {
        valid: !!found || responsibleName.toLowerCase() === 'compartilhado',
        responsible: found?.name || responsibleName,
        cost_center_id: found?.id || null,
        is_shared: responsibleName.toLowerCase() === 'compartilhado',
        available_responsibles: [...(costCenters?.map(cc => cc.name) || []), 'Compartilhado']
      };
    },
    
    saveExpense: async (expenseData) => {
      console.log('🔧 Function call: save_expense', expenseData);
      return { success: true, message: 'Despesa salva com sucesso!' };
    }
  };
  
  try {
    console.log(`📤 Enviando mensagem: "${testMessage}"\n`);
    
    const response = await assistant.sendMessage(testUserId, testMessage, context);
    
    console.log('\n✅ Resposta recebida:');
    console.log('---');
    console.log(response);
    console.log('---\n');
    
    console.log('🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAssistant();

