import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { sendTransactionNotification } from './backend/services/whatsapp.js';

dotenv.config({ path: './backend/.env' });

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testCompleteWithSupabase() {
  try {
    console.log('🎬 TESTE COMPLETO COM SUPABASE\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 1. Criar transação de teste
    const mockTransaction = {
      id: 'test-' + Date.now(),
      description: 'POSTO SHELL SP',
      amount: -180.50,
      date: new Date().toISOString().split('T')[0],
      category: 'Combustível',
    };
    
    console.log('1️⃣ ENVIANDO TEMPLATE WHATSAPP...');
    console.log(`   📱 Descrição: ${mockTransaction.description}`);
    console.log(`   💰 Valor: R$ ${Math.abs(mockTransaction.amount).toFixed(2)}`);
    console.log(`   📅 Data: ${new Date(mockTransaction.date).toLocaleDateString('pt-BR')}\n`);
    
    const whatsappResponse = await sendTransactionNotification(mockTransaction);
    const messageId = whatsappResponse.messages[0].id;
    
    console.log(`   ✅ Template enviado!`);
    console.log(`   📧 Message ID: ${messageId}\n`);
    
    // 2. Salvar no Supabase com o Message ID
    console.log('2️⃣ SALVANDO NO SUPABASE...');
    
    const { data: savedTransaction, error } = await supabase
      .from('expenses')
      .insert({
        pluggy_transaction_id: mockTransaction.id,
        date: mockTransaction.date,
        description: mockTransaction.description,
        amount: Math.abs(mockTransaction.amount),
        category: mockTransaction.category,
        source: 'pluggy',
        status: 'pending',
        whatsapp_message_id: messageId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('   ❌ Erro ao salvar:', error);
      throw error;
    }
    
    console.log(`   ✅ Transação salva!`);
    console.log(`   🆔 ID: ${savedTransaction.id}`);
    console.log(`   📧 WhatsApp Message ID: ${savedTransaction.whatsapp_message_id}`);
    console.log(`   📊 Status: ${savedTransaction.status}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 AGORA NO WHATSAPP:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Abra o WhatsApp');
    console.log('2. Clique em um dos botões');
    console.log('3. O webhook vai:');
    console.log('   ✅ Encontrar a transação no Supabase');
    console.log('   ✅ Atualizar com owner (Felipe/Leticia/Compartilhado)');
    console.log('   ✅ Calcular totais do mês');
    console.log('   ✅ Enviar confirmação\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SISTEMA PRONTO! Clique no botão agora!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error);
  }
}

testCompleteWithSupabase();

