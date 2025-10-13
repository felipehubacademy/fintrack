import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Marcar todas as despesas de abril/maio como confirmed
 * Distribuindo entre Felipe, Letícia e Compartilhado
 */
async function confirmAllMay() {
  console.log('🔧 CONFIRMANDO DESPESAS DE ABRIL/MAIO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    // Buscar todas as pendentes de abril/maio
    const { data: pending, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', 'pending')
      .gte('date', '2025-04-01')
      .lte('date', '2025-05-31');
    
    if (error) throw error;
    
    console.log(`📊 Despesas pendentes: ${pending.length}`);
    
    if (pending.length === 0) {
      console.log('✅ Nenhuma despesa pendente!');
      return;
    }
    
    console.log('\n🎯 Distribuindo despesas...');
    console.log('Você precisa classificar manualmente ou quer que eu distribua automaticamente?');
    console.log('');
    console.log('Opções:');
    console.log('1. Marcar TODAS como Felipe');
    console.log('2. Marcar TODAS como Compartilhado');
    console.log('3. Distribuir aleatoriamente (33% cada)');
    console.log('');
    console.log('💡 RECOMENDAÇÃO: Classifique manualmente no dashboard usando o botão "Editar"!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

confirmAllMay();

