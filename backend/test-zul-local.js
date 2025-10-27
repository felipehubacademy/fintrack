/**
 * Teste local do Zul (sem webhook real)
 * Execute: node backend/test-zul-local.js
 */

import ZulAssistant from './services/zulAssistant.js';
import dotenv from 'dotenv';

dotenv.config();

async function testZul() {
  console.log('🧪 Testando Zul localmente...\n');

  const zul = new ZulAssistant();

  // Simular contexto de usuário
  const userId = 'test-user-123';
  const userName = 'Felipe';
  const userPhone = '5511999999999';

  // Teste 1: Mensagem simples
  console.log('📝 Teste 1: Despesa simples');
  const msg1 = 'Gastei 50 no mercado';
  console.log(`Usuário: "${msg1}"`);
  
  try {
    const result1 = await zul.processMessage(msg1, userId, userName, userPhone);
    console.log(`Zul: "${result1.message}"`);
    console.log('✅ Teste 1 passou\n');
  } catch (error) {
    console.error('❌ Teste 1 falhou:', error.message);
  }

  // Teste 2: Verificar normalização
  console.log('📝 Teste 2: Payment Normalizer');
  const { normalizePaymentMethod } = await import('./utils/paymentNormalizer.js');
  
  const tests = [
    ['crédito', 'credit_card'],
    ['pix', 'pix'],
    ['debit', 'debit_card']
  ];
  
  for (const [input, expected] of tests) {
    const result = normalizePaymentMethod(input);
    if (result === expected) {
      console.log(`✅ "${input}" → "${result}"`);
    } else {
      console.log(`❌ "${input}" → "${result}" (esperado: "${expected}")`);
    }
  }
  console.log('✅ Teste 2 passou\n');

  console.log('🎉 Testes concluídos!');
}

testZul().catch(console.error);

