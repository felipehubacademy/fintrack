import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

async function testToken() {
  try {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const userPhone = process.env.USER_PHONE;
    
    console.log('🔑 Testando token WhatsApp...\n');
    console.log(`📞 Phone ID: ${phoneId}`);
    console.log(`🔑 Token (primeiros 30 chars): ${token.substring(0, 30)}...`);
    console.log(`📱 Para: ${userPhone}\n`);
    
    const message = {
      messaging_product: 'whatsapp',
      to: userPhone,
      type: 'text',
      text: {
        body: '✅ Teste de token - Funcionou!'
      }
    };
    
    console.log('📤 Enviando mensagem de teste...\n');
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    });
    
    const responseText = await response.text();
    
    console.log(`📥 Status: ${response.status}`);
    console.log(`📦 Response: ${responseText}\n`);
    
    if (response.ok) {
      console.log('✅ TOKEN FUNCIONANDO!');
      const data = JSON.parse(responseText);
      console.log(`📧 Message ID: ${data.messages[0].id}\n`);
    } else {
      console.log('❌ TOKEN COM PROBLEMA!');
      const error = JSON.parse(responseText);
      console.log(`⚠️ Erro: ${error.error.message}`);
      console.log(`💡 Code: ${error.error.code}\n`);
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testToken();

