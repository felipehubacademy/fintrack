import SmartConversation from './services/smartConversation.js';
import dotenv from 'dotenv';

dotenv.config();
process.env.USE_ZUL_ASSISTANT = 'true';

async function testSequence() {
  console.log('🧪 Testando sequência completa...\n');
  
  const smartConversation = new SmartConversation();
  const testPhone = '+5511978229898';
  
  try {
    console.log('📤 Msg 2: "Débito"\n');
    await smartConversation.handleMessage('Débito', testPhone);
    
    console.log('\n⏳ Aguardando 2s...\n');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('📤 Msg 3: "Felipe"\n');
    await smartConversation.handleMessage('Felipe', testPhone);
    
    console.log('\n✅ Sequência completa testada!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error);
  }
}

testSequence();
