import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardQuery() {
  try {
    console.log('🔍 Testing dashboard query...');
    
    const selectedMonth = '2025-10';
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = new Date(selectedMonth + '-01');
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    
    console.log('📅 selectedMonth:', selectedMonth);
    console.log('📅 startOfMonth:', startOfMonth);
    console.log('📅 endOfMonth:', endOfMonth.toISOString().split('T')[0]);
    
    // Buscar todas as despesas confirmadas do mês
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', 'confirmed')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Query error:', error);
      return;
    }

    console.log('📊 Raw data from DB:', data);
    console.log('📊 Total expenses found:', data?.length || 0);
    
    if (data && data.length > 0) {
      // Separar cartão e a vista
      const card = data.filter(e => e.payment_method === 'credit_card');
      const cash = data.filter(e => 
        e.payment_method === 'cash' || 
        e.payment_method === 'debit_card' || 
        e.payment_method === 'pix' || 
        e.payment_method === 'bank_transfer' || 
        e.payment_method === 'boleto' || 
        e.payment_method === 'other'
      );
      
      console.log('💳 Card expenses:', card.length, 'items');
      console.log('💵 Cash expenses:', cash.length, 'items');
      
      const cardTotal = card.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const cashTotal = cash.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      console.log('💰 Card total:', cardTotal);
      console.log('💰 Cash total:', cashTotal);
      console.log('💰 Grand total:', cardTotal + cashTotal);
      
      // Mostrar detalhes das despesas
      console.log('\n📋 Card expenses details:');
      card.forEach((expense, index) => {
        console.log(`  ${index + 1}. ${expense.description} - R$ ${expense.amount} - ${expense.payment_method} - ${expense.owner}`);
      });
      
      console.log('\n📋 Cash expenses details:');
      cash.forEach((expense, index) => {
        console.log(`  ${index + 1}. ${expense.description} - R$ ${expense.amount} - ${expense.payment_method} - ${expense.owner}`);
      });
    } else {
      console.log('❌ No expenses found for October 2025');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDashboardQuery();
