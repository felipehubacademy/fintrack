/**
 * Teste do fluxo GPT-4 conversacional
 */

import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const BASE_URL = 'https://fintrack-backend-theta.vercel.app';
const PHONE = '+5511978229898'; // Seu número

async function sendMessage(text) {
  const payload = {
    messaging_product: 'whatsapp',
    contacts: [{ wa_id: PHONE }],
    messages: [{
      from: PHONE,
      id: `test_${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'text',
      text: { body: text }
    }]
  };

  try {
    console.log(`\n📤 Enviando: "${text}"`);
    const response = await axios.post(`${BASE_URL}/api/webhook`, payload);
    console.log('✅ Status:', response.status);
    
    // Aguardar WhatsApp enviar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

async function testFullFlow() {
  console.log('🚀 Testando fluxo GPT-4 conversacional...\n');
  
  try {
    // Aguardar um pouco antes de começar
    console.log('⏳ Aguardando deploy...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mensagem 1
    await sendMessage('Gastei 150 no mercado');
    
    // Mensagem 2
    await sendMessage('pix');
    
    // Mensagem 3
    await sendMessage('eu');
    
    console.log('\n✅ FLUXO COMPLETO! Verifique WhatsApp e o banco de dados.');
    
  } catch (error) {
    console.error('❌ Teste falhou:', error);
  }
}

testFullFlow();

