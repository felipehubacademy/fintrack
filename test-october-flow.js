import LatamService from './backend/services/latamService.js';
import TransactionService from './backend/services/transactionService.js';
import { sendTransactionNotification } from './backend/services/whatsapp.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Teste do fluxo completo com transações de outubro/25
 */
async function testOctoberFlow() {
  console.log('🧪 TESTE DO FLUXO COMPLETO - OUTUBRO/25');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const latamService = new LatamService();
    const transactionService = new TransactionService();
    
    // 1. Buscar transações do LATAM
    console.log('📊 1. Buscando transações do LATAM...');
    const allTransactions = await latamService.getLatamTransactions();
    console.log(`✅ Total de transações encontradas: ${allTransactions.length}`);
    
    // 2. Filtrar transações reais (não futuras)
    const today = new Date();
    const realTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate <= today;
    });
    
    console.log(`📅 2. Transações reais (até hoje): ${realTransactions.length}`);
    
    if (realTransactions.length === 0) {
      console.log('⚠️ Nenhuma transação real encontrada');
      return;
    }
    
    // 3. Mostrar transações encontradas
    console.log('\n📋 3. TRANSAÇÕES REAIS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    realTransactions.forEach((t, i) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      console.log(`${i + 1}. ${date} - ${t.description} - R$ ${t.amount}`);
    });
    
    // 4. Verificar quais já existem no Supabase
    console.log('\n🔍 4. Verificando transações já existentes...');
    const newTransactions = [];
    
    for (const transaction of realTransactions) {
      const exists = await transactionService.transactionExists(transaction.id);
      if (!exists) {
        newTransactions.push(transaction);
      } else {
        console.log(`⚠️ Transação já existe: ${transaction.description}`);
      }
    }
    
    console.log(`📊 Transações novas: ${newTransactions.length}/${realTransactions.length}`);
    
    // 5. Processar transações novas
    if (newTransactions.length > 0) {
      console.log('\n📱 5. Enviando notificações WhatsApp...');
      
      for (const transaction of newTransactions) {
        try {
          console.log(`📤 Enviando: ${transaction.description} - R$ ${transaction.amount}`);
          
          // Enviar notificação WhatsApp
          const whatsappResponse = await sendTransactionNotification(transaction);
          const whatsappMessageId = whatsappResponse.messages[0].id;
          
          // Salvar no Supabase
          await transactionService.saveTransaction(transaction, whatsappMessageId);
          
          console.log(`✅ Enviado e salvo: ${transaction.description}`);
          console.log(`📱 Message ID: ${whatsappMessageId}`);
          
          // Aguardar 3 segundos entre envios
          await new Promise(resolve => setTimeout(resolve, 3000));
          
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
      console.log('\n✅ Todas as transações reais já foram processadas!');
      
      // Mostrar totais atuais
      console.log('\n📊 CALCULANDO TOTAIS ATUAIS...');
      
      const felipeTotal = await transactionService.getMonthlyTotal('Felipe');
      const leticiaTotal = await transactionService.getMonthlyTotal('Leticia');
      const compartilhadoTotal = await transactionService.getMonthlyTotal('Compartilhado');
      
      console.log('💰 TOTAIS ATUAIS:');
      console.log(`Felipe: R$ ${felipeTotal.individualTotal}`);
      console.log(`Letícia: R$ ${leticiaTotal.individualTotal}`);
      console.log(`Compartilhado: R$ ${compartilhadoTotal.sharedTotal}`);
      console.log(`Fatura Total: R$ ${(parseFloat(felipeTotal.ownTotal) + parseFloat(leticiaTotal.ownTotal) + parseFloat(compartilhadoTotal.sharedTotal)).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar o teste
testOctoberFlow();
