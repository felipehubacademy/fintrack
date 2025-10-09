import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './backend/.env' });

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function savePendingTransaction() {
  try {
    console.log('💾 Salvando transação pendente no Supabase...\n');
    
    // Message ID da mensagem que você já recebeu
    const messageId = 'wamid.HBgNNTUxMTk3ODIyOTg5OBUCABEYEjg1NEJBNjFBMjc3MDI0RDgxQwA=';
    
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('expenses')
      .select('*')
      .eq('whatsapp_message_id', messageId)
      .single();
    
    if (existing) {
      console.log('⚠️ Transação já existe!');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   Owner: ${existing.owner || 'não definido'}`);
      
      if (existing.owner) {
        console.log('\n✅ Transação já foi confirmada!');
        return;
      }
      
      console.log('\n📝 Transação existe mas ainda não foi confirmada.');
      console.log('   Clique novamente no botão do WhatsApp!');
      return;
    }
    
    // Criar nova transação
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        pluggy_transaction_id: 'test-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        description: 'POSTO SHELL SP',
        amount: 180.50,
        category: 'Combustível',
        source: 'pluggy',
        status: 'pending',
        whatsapp_message_id: messageId,
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro:', error);
      return;
    }
    
    console.log('✅ Transação salva!');
    console.log(`   ID: ${data.id}`);
    console.log(`   Message ID: ${data.whatsapp_message_id}`);
    console.log(`   Status: ${data.status}\n`);
    
    console.log('📱 AGORA clique novamente no botão do WhatsApp!');
    console.log('   O webhook vai encontrar a transação e processar!\n');
    
  } catch (error) {
    console.error('❌ ERRO:', error);
  }
}

savePendingTransaction();

