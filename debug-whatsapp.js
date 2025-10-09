import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

async function testConfirmationTemplate() {
  try {
    console.log('🧪 Testando template de confirmação...\n');
    
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const userPhone = process.env.USER_PHONE;
    
    console.log(`📞 Phone ID: ${phoneId}`);
    console.log(`📱 Para: ${userPhone}`);
    console.log(`🔑 Token: ${token.substring(0, 30)}...\n`);
    
    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'template',
      template: {
        name: 'fintrack_confirmacao',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: '180.50' },
              { type: 'text', text: 'Felipe' },
              { type: 'text', text: '08/10/2025' },
              { type: 'text', text: '180.50' },
              { type: 'text', text: '0.00' },
              { type: 'text', text: '180.50' }
            ]
          }
        ]
      }
    };
    
    console.log('📤 Enviando template de confirmação...');
    
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    
    const responseText = await response.text();
    
    console.log(`📥 Status: ${response.status}`);
    console.log(`📦 Response: ${responseText}\n`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ TEMPLATE ENVIADO COM SUCESSO!');
      console.log(`📧 Message ID: ${data.messages[0].id}\n`);
    } else {
      console.log('❌ ERRO AO ENVIAR TEMPLATE!');
      const error = JSON.parse(responseText);
      console.log(`⚠️ Erro: ${error.error.message}`);
      console.log(`💡 Code: ${error.error.code}\n`);
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testConfirmationTemplate();
