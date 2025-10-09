import dotenv from 'dotenv';
import { sendTransactionNotification, sendConfirmationMessage } from './backend/services/whatsapp.js';
import TransactionService from './backend/services/transactionService.js';

dotenv.config({ path: './backend/.env' });

async function simulateFullFlow() {
  try {
    console.log('🎬 SIMULANDO FLUXO COMPLETO - SEM WEBHOOK\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const transactionService = new TransactionService();
    
    // 1. Transação de teste
    const mockTransaction = {
      id: 'test-latam-' + Date.now(),
      description: 'POSTO SHELL SP',
      amount: -250.00,
      date: new Date().toISOString().split('T')[0],
      category: 'Combustível',
    };
    
    console.log('1️⃣ ENVIANDO NOTIFICAÇÃO WHATSAPP...');
    console.log(`   📱 Descrição: ${mockTransaction.description}`);
    console.log(`   💰 Valor: R$ ${Math.abs(mockTransaction.amount).toFixed(2)}`);
    console.log(`   📅 Data: ${new Date(mockTransaction.date).toLocaleDateString('pt-BR')}\n`);
    
    const whatsappResponse = await sendTransactionNotification(mockTransaction);
    const messageId = whatsappResponse.messages[0].id;
    
    console.log(`   ✅ Template enviado!`);
    console.log(`   📧 Message ID: ${messageId}\n`);
    
    // 2. Salvar transação no Supabase com o Message ID
    console.log('2️⃣ SALVANDO TRANSAÇÃO NO SUPABASE...');
    
    const savedTransaction = await transactionService.saveTransaction({
      ...mockTransaction,
      whatsapp_message_id: messageId,
    });
    
    console.log(`   ✅ Transação salva!`);
    console.log(`   🆔 ID: ${savedTransaction.id}`);
    console.log(`   📊 Status: ${savedTransaction.status}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 AGORA NO WHATSAPP: Clique em um botão!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('⏳ Aguardando 10 segundos para você clicar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 3. SIMULAR que o usuário clicou em "Felipe"
    console.log('3️⃣ SIMULANDO CLIQUE NO BOTÃO "FELIPE"...\n');
    
    const selectedOwner = 'Felipe'; // Simular escolha
    
    // 4. Confirmar transação
    console.log('4️⃣ CONFIRMANDO TRANSAÇÃO NO SUPABASE...');
    
    const confirmedTransaction = await transactionService.confirmTransaction(
      mockTransaction.id,
      selectedOwner,
      messageId
    );
    
    console.log(`   ✅ Transação confirmada para ${selectedOwner}!`);
    console.log(`   💰 Valor: R$ ${confirmedTransaction.amount}`);
    console.log(`   👤 Owner: ${confirmedTransaction.owner}\n`);
    
    // 5. Calcular totais
    console.log('5️⃣ CALCULANDO TOTAIS DO MÊS...');
    
    const monthlyTotal = await transactionService.getMonthlyTotal(selectedOwner);
    
    console.log(`   📊 Total de ${selectedOwner}:`);
    console.log(`      • Gastos próprios: R$ ${monthlyTotal.ownTotal}`);
    console.log(`      • Compartilhado (50%): R$ ${monthlyTotal.sharedIndividual}`);
    console.log(`      • TOTAL INDIVIDUAL: R$ ${monthlyTotal.individualTotal}\n`);
    
    // 6. Enviar confirmação via WhatsApp
    console.log('6️⃣ ENVIANDO CONFIRMAÇÃO VIA WHATSAPP...');
    
    await sendConfirmationMessage(selectedOwner, confirmedTransaction, monthlyTotal);
    
    console.log(`   ✅ Mensagem de confirmação enviada!\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 FLUXO COMPLETO EXECUTADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📱 Verifique seu WhatsApp para a mensagem de confirmação!\n');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
  }
}

simulateFullFlow();

