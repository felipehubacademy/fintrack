const { createClient } = require('@supabase/supabase-js');

// Substitua pelas suas credenciais reais
const supabaseUrl = 'SUA_URL_AQUI';
const supabaseKey = 'SUA_CHAVE_AQUI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestExpense() {
  console.log('➕ Adicionando despesa de teste para /finance...');
  
  const testExpense = {
    description: 'Teste PIX - Farmácia',
    amount: 25.50,
    category: 'Saúde',
    payment_method: 'pix', // PIX para aparecer em /finance
    owner: 'Felipe',
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0], // Hoje
    created_at: new Date().toISOString()
  };
  
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([testExpense])
      .select();
      
    if (error) {
      console.error('❌ Erro:', error);
      return;
    }
    
    console.log('✅ Despesa adicionada:', data[0]);
    console.log('🎯 Agora acesse /dashboard/finance para ver a despesa!');
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

addTestExpense();
