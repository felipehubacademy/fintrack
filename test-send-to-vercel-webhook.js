import fetch from 'node-fetch';

// Payload exato que o WhatsApp envia quando clica no botão
const webhookPayload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "254587284410534",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15550690187",
              "phone_number_id": "280543888475181"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Felipe"
                },
                "wa_id": "5511978229898"
              }
            ],
            "messages": [
              {
                "from": "5511978229898",
                "id": "wamid.HBgNNTUxMTk3ODIyOTg5OBUCABIYFjNFQjBDMTMzOTlEMEQ4RjhGQkE2AA==",
                "timestamp": "1728444000",
                "type": "button",
                "button": {
                  "text": "Felipe",
                  "payload": "Felipe"
                },
                "context": {
                  "from": "15550690187",
                  "id": "wamid.HBgNNTUxMTk3ODIyOTg5OBUCABEYEjk3MUZCNDIxRUEyQzIwRDJBQgA="
                }
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

async function testVercelWebhook() {
  try {
    console.log('🧪 Testando webhook do Vercel...\n');
    
    console.log('📤 Enviando POST para: https://fintrack-backend-theta.vercel.app/webhook');
    console.log('📦 Payload:', JSON.stringify(webhookPayload, null, 2));
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const response = await fetch('https://fintrack-backend-theta.vercel.app/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const responseText = await response.text();
    
    console.log(`📥 Resposta do servidor:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Body: ${responseText}\n`);
    
    if (response.status === 200) {
      console.log('✅ Webhook processado com sucesso!');
      console.log('\n📱 Agora verifique:');
      console.log('   1. Logs do Vercel (https://vercel.com/dashboard)');
      console.log('   2. Seu WhatsApp (deve receber confirmação)');
      console.log('   3. Supabase (transação deve estar salva)\n');
    } else {
      console.log('❌ Webhook retornou erro!');
      console.log('⚠️ Verifique os logs do Vercel para mais detalhes\n');
    }
    
  } catch (error) {
    console.error('❌ ERRO ao chamar webhook:', error.message);
    console.error(error);
  }
}

testVercelWebhook();

