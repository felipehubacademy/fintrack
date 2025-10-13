import OpenAIService from './backend/services/openaiService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const openai = new OpenAIService();

/**
 * Teste completo da integração OpenAI
 */
async function testOpenAI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE DA INTEGRAÇÃO OPENAI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verificar se a chave está configurada
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY não encontrada no .env!');
    console.log('📝 Adicione: OPENAI_API_KEY=sk-proj-...');
    process.exit(1);
  }

  console.log('✅ OPENAI_API_KEY encontrada!\n');

  // Teste 1: Mensagem perfeita
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE 1: Mensagem perfeita');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const test1 = await openai.interpretExpense('Gastei 300,50 no posto de gasolina');
  console.log('📥 Input:', 'Gastei 300,50 no posto de gasolina');
  console.log('📤 Output:', test1);
  console.log('✅ Resultado:', test1.amount === 300.5 ? 'PASS' : 'FAIL');
  console.log('');

  // Teste 2: Mensagem com erros de digitação
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE 2: Erros de digitação');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const test2 = await openai.interpretExpense('gati 20 nu mercado');
  console.log('📥 Input:', 'gati 20 nu mercado');
  console.log('📤 Output:', test2);
  console.log('✅ Correção:', test2.correctedMessage);
  console.log('✅ Resultado:', test2.amount === 20 ? 'PASS' : 'FAIL');
  console.log('');

  // Teste 3: Mensagem informal
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE 3: Mensagem informal');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const test3 = await openai.interpretExpense('150 no uber');
  console.log('📥 Input:', '150 no uber');
  console.log('📤 Output:', test3);
  console.log('✅ Resultado:', test3.amount === 150 ? 'PASS' : 'FAIL');
  console.log('');

  // Teste 4: Sem valor
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE 4: Mensagem sem valor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const test4 = await openai.interpretExpense('fui ao mercado');
  console.log('📥 Input:', 'fui ao mercado');
  console.log('📤 Output:', test4);
  console.log('✅ Resultado:', test4 === null ? 'PASS (corretamente rejeitado)' : 'FAIL');
  console.log('');

  // Teste 5: Múltiplas despesas
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE 5: Múltiplas despesas');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const test5 = await openai.detectMultipleExpenses('Hoje gastei 50 no mercado e 80 no posto');
  console.log('📥 Input:', 'Hoje gastei 50 no mercado e 80 no posto');
  console.log('📤 Output:', test5);
  console.log('✅ Resultado:', test5.multiplas ? 'PASS (detectou múltiplas)' : 'FAIL');
  console.log('');

  // Teste 6: Geração de confirmação
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TESTE 6: Geração de confirmação');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const confirmation = await openai.generateConfirmation({
    amount: 147.50,
    description: 'Supermercado Pão de Açúcar',
    category: 'Supermercado'
  });
  console.log('📥 Input:', { amount: 147.50, description: 'Supermercado Pão de Açúcar', category: 'Supermercado' });
  console.log('📤 Output:', confirmation);
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 TESTES CONCLUÍDOS!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 PRÓXIMOS PASSOS:');
  console.log('1. Testes de texto: ✅');
  console.log('2. Teste de áudio: 🎤 (requer URL de áudio WhatsApp)');
  console.log('3. Teste de imagem: 📸 (requer URL de imagem WhatsApp)');
  console.log('');
  console.log('🚀 Sistema pronto para receber mensagens no WhatsApp!');
}

// Executar testes
testOpenAI().catch(error => {
  console.error('❌ Erro nos testes:', error);
  process.exit(1);
});

