import dotenv from 'dotenv';
import { sendTransactionNotification } from './backend/services/whatsapp.js';

dotenv.config({ path: './backend/.env' });

async function testWhatsAppTemplate() {
  try {
    console.log('🚀 Testando envio de template WhatsApp...\n');
    
    // Transação de teste
    const mockTransaction = {
      id: 'test-' + Date.now(),
      description: 'Compra aprovada',
      amount: -150.00,
      date: new Date().toISOString().split('T')[0],
      category: 'Compras',
    };
    
    console.log('📱 Enviando template WhatsApp aprovado...');
    console.log(`   Descrição: ${mockTransaction.description}`);
    console.log(`   Valor: R$ ${Math.abs(mockTransaction.amount).toFixed(2)}`);
    console.log(`   Data: ${new Date(mockTransaction.date).toLocaleDateString('pt-BR')}\n`);
    
    const whatsappResponse = await sendTransactionNotification(mockTransaction);
    
    console.log('✅ Template enviado com sucesso!');
    console.log(`📧 Message ID: ${whatsappResponse.messages[0].id}`);
    console.log(`📱 Para: ${whatsappResponse.contacts[0].wa_id}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 AGORA NO WHATSAPP:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Abra o WhatsApp');
    console.log('2. Você verá a mensagem com o template aprovado');
    console.log('3. Clique em um dos botões:');
    console.log('   🔘 Felipe');
    console.log('   🔘 Leticia');
    console.log('   🔘 Compartilhado');
    console.log('');
    console.log('4. O webhook vai processar e você receberá:');
    console.log('   ✅ Mensagem de confirmação');
    console.log('   📊 Resumo dos totais do mês');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 TESTE INICIADO! Aguardando sua resposta...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    
    if (error.message.includes('template')) {
      console.error('\n⚠️ POSSÍVEL CAUSA:');
      console.error('   • Template ainda não foi aprovado pelo WhatsApp');
      console.error('   • Nome do template incorreto no código');
      console.error('   • Verifique no Meta Business Suite se o template está APPROVED');
    }
    
    console.error('\n🔍 Detalhes do erro:');
    console.error(error);
  }
}

testWhatsAppTemplate();

