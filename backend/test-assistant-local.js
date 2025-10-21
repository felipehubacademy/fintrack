import SmartConversation from './services/smartConversation.js';
import dotenv from 'dotenv';

dotenv.config();

// Forçar uso do Assistant
process.env.USE_ZUL_ASSISTANT = 'true';

async function testAssistant() {
  console.log('🧪 Testando Assistant ZUL localmente...\n');
  
  const smartConversation = new SmartConversation();
  
  // Seu número de telefone (do .env ou hardcoded)
  const testPhone = process.env.USER_PHONE_FELIPE || '5511951928551';
  
  console.log(`📱 Telefone de teste: ${testPhone}`);
  console.log(`✅ USE_ZUL_ASSISTANT: ${process.env.USE_ZUL_ASSISTANT}`);
  console.log(`✅ OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Configurada' : 'FALTANDO!'}\n`);
  
  try {
    console.log('📤 Enviando mensagem: "Zul, gastei 50 de gasolina"\n');
    
    await smartConversation.handleMessage('Zul, gastei 50 de gasolina', testPhone);
    
    console.log('\n✅ Teste concluído! Verifique os logs acima.');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    console.error('Stack:', error.stack);
  }
}

testAssistant();

