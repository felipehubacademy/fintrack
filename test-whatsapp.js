import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

async function testWhatsApp() {
  try {
    console.log('📱 Testando WhatsApp Cloud API...');
    
    const phoneNumberId = process.env.PHONE_ID;
    const accessToken = process.env.WHATSAPP_TOKEN;
    
    console.log(`📞 Phone ID: ${phoneNumberId}`);
    console.log(`🔑 Token: ${accessToken.substring(0, 20)}...`);
    
    // Testar envio de mensagem
    const messageData = {
      messaging_product: "whatsapp",
      to: process.env.USER_PHONE || "+5511999999999", // Seu número para teste
      type: "text",
      text: {
        body: "🎉 Teste do FinTrack! Sistema funcionando perfeitamente!"
      }
    };
    
    console.log('\n📤 Enviando mensagem de teste...');
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Mensagem enviada com sucesso!');
      console.log('📱 Resposta:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.json();
      console.log('❌ Erro ao enviar mensagem:');
      console.log(JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testWhatsApp();
