import OpenAIService from './services/openaiService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const openai = new OpenAIService();

async function test() {
  console.log('🧪 Testando OpenAI...\n');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY não encontrada!');
    process.exit(1);
  }
  
  console.log('✅ Chave encontrada!\n');
  
  console.log('📝 Teste 1: "Gastei 50 no mercado"');
  const r1 = await openai.interpretExpense('Gastei 50 no mercado');
  console.log('Resultado:', r1);
  console.log('');
  
  console.log('📝 Teste 2: "gati 20 nu posto" (com erro)');
  const r2 = await openai.interpretExpense('gati 20 nu posto');
  console.log('Resultado:', r2);
  console.log('Corrigido:', r2?.correctedMessage);
  console.log('');
  
  console.log('🎉 Testes OK!');
}

test().catch(e => console.error('Erro:', e.message));
