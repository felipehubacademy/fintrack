import axios from 'axios';

// Script para verificar o novo número após atualizar as credenciais
async function verifyNewNumber() {
  try {
    console.log('🔍 VERIFICANDO NOVO NÚMERO WHATSAPP...\n');
    
    const phoneId = '1305894714600979';
    const phoneNumber = '+55 11 5192-8551';
    
    console.log(`📱 Phone ID: ${phoneId}`);
    console.log(`📞 Número: ${phoneNumber}\n`);
    
    // Testar webhook com novo número
    console.log('🧪 TESTANDO WEBHOOK COM NOVO NÚMERO...');
    
    const testPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test_whatsapp_business_account_id',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '551151928551',
                  phone_number_id: phoneId
                },
                contacts: [
                  {
                    profile: {
                      name: 'Test User'
                    },
                    wa_id: '5511978229898'
                  }
                ],
                messages: [
                  {
                    from: '5511978229898',
                    id: `wamid.test_${Date.now()}`,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: {
                      body: 'Teste com novo número'
                    },
                    type: 'text'
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };
    
    const response = await axios.post('https://fintrack-backend-theta.vercel.app/webhook', testPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Status:', response.status);
    console.log('📄 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', error.response.data);
    }
  }
}

verifyNewNumber();
