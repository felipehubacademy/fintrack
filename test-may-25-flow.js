import LatamService from './backend/services/latamService.js';
import TransactionService from './backend/services/transactionService.js';
import { sendTransactionNotification } from './backend/services/whatsapp.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Teste do fluxo completo com transações de maio/25
 * Ciclo: 9 de abril a 8 de maio de 2025
 */
async function testMay25Flow() {
  console.log('🧪 TESTE DO FLUXO COMPLETO - MAIO/25');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const latamService = new LatamService();
    const transactionService = new TransactionService();
    
    // 1. Buscar transações do LATAM
    console.log('📊 1. Buscando transações do LATAM...');
    const allTransactions = await latamService.getLatamTransactions();
    console.log(`✅ Total de transações encontradas: ${allTransactions.length}`);
    
    // 2. Filtrar transações do ciclo de maio/24 (9/abr a 8/mai de 2024)
    const startDate = '2024-04-09';
    const endDate = '2024-05-08';
    
    const may25Transactions = allTransactions.filter(t => {
      const transactionDate = t.date;
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    console.log(`📅 2. Transações do ciclo maio/24 (${startDate} a ${endDate}): ${may25Transactions.length}`);
    
    if (may25Transactions.length === 0) {
      console.log('⚠️ Nenhuma transação encontrada para maio/24');
      console.log('💡 Vamos listar algumas transações disponíveis:');
      allTransactions.slice(0, 10).forEach((t, i) => {
        console.log(`${i + 1}. ${t.date} - ${t.description} - R$ ${t.amount}`);
      });
      return;
    }
    
    // 3. Mostrar transações encontradas
    console.log('\n📋 3. TRANSAÇÕES DO CICLO MAIO/24:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    may25Transactions.forEach((t, i) => {
      console.log(`${i + 1}. ${t.date} - ${t.description} - R$ ${t.amount}`);
    });
    
    // 4. Verificar quais já existem no Supabase
    console.log('\n🔍 4. Verificando transações já existentes...');
    const newTransactions = [];
    
    for (const transaction of may25Transactions) {
      const exists = await transactionService.transactionExists(transaction.id);
      if (!exists) {
        newTransactions.push(transaction);
      }
    }
    
    console.log(`📊 Transações novas: ${newTransactions.length}/${may25Transactions.length}`);
    
    // 5. Processar transações novas
    if (newTransactions.length > 0) {
      console.log('\n📱 5. Enviando notificações WhatsApp...');
      
      for (const transaction of newTransactions) {
        try {
          console.log(`📤 Enviando: ${transaction.description} - R$ ${transaction.amount}`);
          
          // Enviar apenas para Felipe (teste)
          const whatsappResponse = await sendTransactionNotification(transaction);
          const whatsappMessageId = whatsappResponse.messages[0].id;
          
          // Salvar no Supabase
          await transactionService.saveTransaction(transaction, whatsappMessageId);
          
          console.log(`✅ Enviado e salvo: ${transaction.description}`);
          
          // Aguardar 2 segundos entre envios
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Erro ao processar ${transaction.description}:`, error.message);
        }
      }
      
      console.log(`\n🎉 PROCESSAMENTO CONCLUÍDO!`);
      console.log(`📱 ${newTransactions.length} notificações enviadas`);
      console.log(`💾 ${newTransactions.length} transações salvas no Supabase`);
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. Verifique as mensagens no WhatsApp');
      console.log('2. Clique nos botões (Felipe/Letícia/Compartilhado)');
      console.log('3. Verifique as confirmações');
      console.log('4. Acesse o dashboard para ver os totais');
      
    } else {
      console.log('\n✅ Todas as transações de maio/24 já foram processadas!');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar o teste
testMay25Flow();
