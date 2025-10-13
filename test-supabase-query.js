import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 TESTANDO QUERY DO SUPABASE...\n');

try {
  // Buscar todas as expenses
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ ${data.length} transações encontradas\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TRANSAÇÕES NO SUPABASE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    data.forEach((t, i) => {
      console.log(`${i + 1}. ${t.description}`);
      console.log(`   Valor: R$ ${t.amount}`);
      console.log(`   Data: ${t.date}`);
      console.log(`   Owner: ${t.owner || 'Pendente'}`);
      console.log(`   Status: ${t.status}`);
      console.log(`   Category: ${t.category || 'N/A'}`);
      console.log('');
    });
  }
} catch (error) {
  console.error('❌ Erro:', error);
}
