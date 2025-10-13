import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Atualizar as 3 transações de outubro para status "confirmed"
 */
async function fixOctoberTransactions() {
  console.log('🔧 ATUALIZANDO TRANSAÇÕES DE OUTUBRO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    // Buscar transações de outubro com owner definido mas status pending
    const { data: pendingWithOwner, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .not('owner', 'is', null)
      .eq('status', 'pending')
      .gte('date', '2025-10-01')
      .lte('date', '2025-10-31');
    
    if (fetchError) throw fetchError;
    
    console.log(`📊 Encontradas ${pendingWithOwner.length} transações com owner mas status pending`);
    
    if (pendingWithOwner.length === 0) {
      console.log('✅ Nenhuma transação para atualizar!');
      return;
    }
    
    console.log('\n📋 TRANSAÇÕES A ATUALIZAR:');
    pendingWithOwner.forEach((t, i) => {
      console.log(`${i + 1}. ${t.description} - ${t.owner} - R$ ${t.amount}`);
    });
    
    // Atualizar todas para status "confirmed"
    const { data: updated, error: updateError } = await supabase
      .from('expenses')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        split: false // Felipe/Leticia individual
      })
      .not('owner', 'is', null)
      .eq('status', 'pending')
      .gte('date', '2025-10-01')
      .lte('date', '2025-10-31')
      .select();
    
    if (updateError) throw updateError;
    
    console.log(`\n✅ ${updated.length} transações atualizadas para "confirmed"!`);
    
    // Mostrar totais
    const { data: allConfirmed, error: totalsError } = await supabase
      .from('expenses')
      .select('owner, amount')
      .eq('status', 'confirmed')
      .gte('date', '2025-10-01')
      .lte('date', '2025-10-31');
    
    if (totalsError) throw totalsError;
    
    const felipe = allConfirmed.filter(e => e.owner === 'Felipe').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const leticia = allConfirmed.filter(e => e.owner === 'Leticia').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const compartilhado = allConfirmed.filter(e => e.owner === 'Compartilhado').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    console.log('\n💰 TOTAIS DE OUTUBRO/2025:');
    console.log(`Felipe: R$ ${felipe.toFixed(2)}`);
    console.log(`Letícia: R$ ${leticia.toFixed(2)}`);
    console.log(`Compartilhado: R$ ${compartilhado.toFixed(2)}`);
    console.log(`Total: R$ ${(felipe + leticia + compartilhado).toFixed(2)}`);
    
    console.log('\n✅ Agora recarregue o dashboard!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
fixOctoberTransactions();
