import dotenv from 'dotenv';
import { sendTransactionNotification } from './backend/services/whatsapp.js';
import TransactionService from './backend/services/transactionService.js';

dotenv.config({ path: './backend/.env' });

async function testCompleteFlow() {
  try {
    console.log('🚀 Testando fluxo completo de transação...\n');
    
    const transactionService = new TransactionService();
    
    // 1. Criar transação de teste
    const mockTransaction = {
      id: 'test-' + Date.now(),
      description: 'Compra aprovada',
      amount: -150.00,
      date: new Date().toISOString().split('T')[0],
      category: 'Compras',
    };
    
    console.log('1️⃣ Salvando transação no Supabase...');
    const savedTransaction = await transactionService.saveTransaction({
      ...mockTransaction,
      whatsapp_message_id: null, // Será preenchido após enviar WhatsApp
    });
    
    console.log(`✅ Transação salva com ID: ${savedTransaction.id}`);
    console.log(`   Status: ${savedTransaction.status}`);
    console.log(`   Descrição: ${savedTransaction.description}\n`);
    
    // 2. Enviar notificação WhatsApp com template
    console.log('2️⃣ Enviando notificação WhatsApp com template aprovado...');
    const whatsappResponse = await sendTransactionNotification(mockTransaction);
    
    console.log(`✅ WhatsApp enviado!`);
    console.log(`   Message ID: ${whatsappResponse.messages[0].id}\n`);
    
    // 3. Atualizar transação com WhatsApp Message ID
    console.log('3️⃣ Atualizando transação com WhatsApp Message ID...');
    await transactionService.confirmTransaction(
      mockTransaction.id,
      null, // owner será definido quando usuário clicar no botão
      whatsappResponse.messages[0].id
    );
    
    console.log('✅ Transação atualizada!\n');
    
    // 4. Instruções para o teste
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 PRÓXIMOS PASSOS - TESTE MANUAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Abra o WhatsApp e verifique a mensagem');
    console.log('2. Clique em um dos botões:');
    console.log('   • Felipe');
    console.log('   • Leticia');
    console.log('   • Compartilhado');
    console.log('');
    console.log('3. O sistema vai:');
    console.log('   ✅ Salvar a escolha no Supabase');
    console.log('   ✅ Calcular os totais do mês');
    console.log('   ✅ Enviar mensagem de confirmação');
    console.log('');
    console.log('4. Você vai receber uma mensagem tipo:');
    console.log('   "✅ Despesa confirmada!"');
    console.log('   "💰 R$ 150,00 registrado para Felipe"');
    console.log('   "📊 Total de Felipe em janeiro 2025: R$ X"');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 TESTE INICIADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ ERRO no teste:', error.message);
    console.error(error);
  }
}

testCompleteFlow();

