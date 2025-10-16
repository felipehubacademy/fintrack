const { createClient } = require('@supabase/supabase-js');

// Usar as credenciais do web/.env.local
const supabaseUrl = 'https://your-project.supabase.co'; // Substitua pela URL real
const supabaseKey = 'your-anon-key'; // Substitua pela chave real

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExpenses() {
  console.log('🔍 Verificando despesas no banco...');
  
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.error('❌ Erro:', error);
      return;
    }
    
    console.log('📊 Últimas 5 despesas:');
    data.forEach((expense, i) => {
      console.log(`${i+1}. ID: ${expense.id}`);
      console.log(`   Status: ${expense.status}`);
      console.log(`   Payment Method: ${expense.payment_method}`);
      console.log(`   Amount: R$ ${expense.amount}`);
      console.log(`   Description: ${expense.description}`);
      console.log(`   Date: ${expense.date}`);
      console.log(`   Owner: ${expense.owner}`);
      console.log(`   Organization ID: ${expense.organization_id}`);
      console.log('---');
    });
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

checkExpenses();
