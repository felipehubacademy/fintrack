import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

async function testNewPhone() {
  try {
    console.log('📱 Testando novo Phone ID...');
    
    const phoneNumberId = '280543888475181'; // Novo Phone ID
    const accessToken = process.env.WHATSAPP_TOKEN;
    const userPhone = process.env.USER_PHONE || '+5511999999999';
    
    console.log(`📞 Novo Phone ID: ${phoneNumberId}`);
    console.log(`🔑 Token: ${accessToken.substring(0, 20)}...`);
    console.log(`📱 Enviando para: ${userPhone}`);
    
    // Testar envio de mensagem
    const messageData = {
      messaging_product: "whatsapp",
      to: userPhone,
      type: "text",
      text: {
        body: "🎉 FinTrack funcionando! Sistema conectado ao cartão LATAM com sucesso! 💳"
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
      
      console.log('\n🎉 WHATSAPP FUNCIONANDO!');
      console.log('✅ Sistema completo e operacional');
      
    } else {
      const error = await response.json();
      console.log('❌ Erro ao enviar mensagem:');
      console.log(JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testNewPhone();
