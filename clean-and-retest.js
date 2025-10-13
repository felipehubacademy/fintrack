import { createClient } from '@supabase/supabase-js';
import LatamService from './backend/services/latamService.js';
import TransactionService from './backend/services/transactionService.js';
import { sendTransactionNotification } from './backend/services/whatsapp.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Limpar Supabase e reprocessar transações reais
 */
async function cleanAndRetest() {
  console.log('🧹 LIMPANDO E REPROCESSANDO TRANSAÇÕES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Limpar Supabase
    console.log('🧹 1. Limpando Supabase...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Deletar todas as transações
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) throw deleteError;
    console.log('✅ Supabase limpo!');
    
    // 2. Buscar transações reais
    console.log('\n📊 2. Buscando transações reais...');
    const latamService = new LatamService();
    const allTransactions = await latamService.getLatamTransactions();
    
    const today = new Date();
    const realTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate <= today;
    });
    
    console.log(`✅ ${realTransactions.length} transações reais encontradas`);
    
    // 3. Mostrar transações
    console.log('\n📋 3. TRANSAÇÕES PARA PROCESSAR:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    realTransactions.forEach((t, i) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      console.log(`${i + 1}. ${date} - ${t.description} - R$ ${t.amount}`);
    });
    
    // 4. Processar transações
    console.log('\n📱 4. Processando transações...');
    const transactionService = new TransactionService();
    
    for (const transaction of realTransactions) {
      try {
        console.log(`\n📤 Processando: ${transaction.description}`);
        console.log(`   Valor: R$ ${transaction.amount}`);
        console.log(`   Data: ${new Date(transaction.date).toLocaleDateString('pt-BR')}`);
        
        // Enviar notificação WhatsApp
        console.log('   📱 Enviando WhatsApp...');
        const whatsappResponse = await sendTransactionNotification(transaction);
        const whatsappMessageId = whatsappResponse.messages[0].id;
        
        // Salvar no Supabase
        console.log('   💾 Salvando no Supabase...');
        await transactionService.saveTransaction(transaction, whatsappMessageId);
        
        console.log(`   ✅ Processado com sucesso!`);
        console.log(`   📱 Message ID: ${whatsappMessageId}`);
        
        // Aguardar 5 segundos entre envios
        console.log('   ⏳ Aguardando 5s...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`   ❌ Erro: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 PROCESSAMENTO CONCLUÍDO!`);
    console.log(`📱 ${realTransactions.length} notificações enviadas`);
    console.log(`💾 ${realTransactions.length} transações salvas no Supabase`);
    
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. ✅ Verifique as mensagens no WhatsApp');
    console.log('2. ✅ Clique nos botões (Felipe/Letícia/Compartilhado)');
    console.log('3. ✅ Verifique as confirmações');
    console.log('4. ✅ Acesse o dashboard para ver os totais');
    
    console.log('\n💰 TOTAL ESPERADO:');
    const totalAmount = realTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    console.log(`R$ ${totalAmount.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
cleanAndRetest();
