import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_ID = process.env.PHONE_ID || '787122227826364';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const TO_NUMBER = '5511978229898'; // Seu número

async function sendTestMessage() {
  try {
    console.log('📱 Enviando mensagem de teste...');
    console.log(`📞 De: ${PHONE_ID}`);
    console.log(`📞 Para: ${TO_NUMBER}`);
    
    const message = {
      messaging_product: 'whatsapp',
      to: TO_NUMBER,
      type: 'text',
      text: {
        body: '🎉 Webhook V2 funcionando! FinTrack está pronto para receber suas despesas. Envie uma mensagem como: "Gastei 50 no mercado no débito"'
      }
    };

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_ID}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mensagem enviada com sucesso!');
    console.log('📋 Resposta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
  }
}

sendTestMessage();

