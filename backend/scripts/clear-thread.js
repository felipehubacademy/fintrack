import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function clearThread() {
  try {
    const phoneNumber = '+5511978229898'; // Felipe
    
    console.log(`🗑️ Limpando thread para ${phoneNumber}...`);
    
    const { data, error } = await supabase
      .from('conversation_state')
      .update({
        state: 'idle',
        temp_data: {}
      })
      .eq('user_phone', phoneNumber);

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    console.log('✅ Thread limpa com sucesso!');
    console.log('   Agora o Assistant vai criar uma nova thread com as novas instruções.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

clearThread();

