import fetch from 'node-fetch';

// Simular o clique no botão Felipe para a transação ID 2
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
              "display_phone_number": "15550643934",
              "phone_number_id": "280543888475181"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Felipe Xavier"
                },
                "wa_id": "5511978229898"
              }
            ],
            "messages": [
              {
                "context": {
                  "from": "15550643934",
                  "id": "wamid.HBgNNTUxMTk3ODIyOTg5OBUCABEYEjVGMTkzQzYzNkE1QUQ0RTc0NwA="
                },
                "from": "5511978229898",
                "id": "wamid.TEST_DIRECT_WEBHOOK",
                "timestamp": "1760043572",
                "type": "button",
                "button": {
                  "payload": "Felipe",
                  "text": "Felipe"
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

async function testVercelWebhookDirect() {
  try {
    console.log('🧪 TESTANDO WEBHOOK DO VERCEL DIRETAMENTE\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📤 Enviando POST para Vercel...');
    console.log('🌐 URL: https://fintrack-backend-theta.vercel.app/webhook\n');
    
    const response = await fetch('https://fintrack-backend-theta.vercel.app/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const responseText = await response.text();
    
    console.log(`📥 Status: ${response.status}`);
    console.log(`📦 Response: ${responseText}\n`);
    
    if (response.status === 200) {
      console.log('✅ WEBHOOK PROCESSADO!');
      console.log('\n📱 Agora:');
      console.log('   1. Verifique os logs do Vercel');
      console.log('   2. Verifique seu WhatsApp');
      console.log('   3. Verifique o Supabase (transação ID 2 deve estar com owner=Felipe)\n');
    } else {
      console.log('❌ WEBHOOK RETORNOU ERRO!');
      console.log('⚠️ Verifique os logs do Vercel para mais detalhes\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 PRÓXIMO PASSO: Verifique os logs do Vercel!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testVercelWebhookDirect();

