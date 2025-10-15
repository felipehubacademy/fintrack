import axios from 'axios';

/**
 * API para enviar mensagem de teste do WhatsApp
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
  const PHONE_ID = process.env.PHONE_ID;
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const TO_NUMBER = '5511978229898';

  try {
    console.log('📱 Enviando mensagem de teste...');
    
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
    
    return res.status(200).json({
      success: true,
      message: 'Mensagem enviada!',
      data: response.data
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
}

