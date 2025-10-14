import axios from 'axios';

// Script para descobrir Phone Number ID via API do Vercel
async function getPhoneIdViaVercel() {
  try {
    console.log('🔍 DESCOBRINDO PHONE NUMBER ID VIA VERCEL...\n');
    
    // Testar com diferentes Phone IDs possíveis
    const possiblePhoneIds = [
      '1305894714600979', // Account ID (não é o Phone ID)
      '787122227826364',  // Phone ID antigo
      // Vamos tentar descobrir outros padrões
    ];
    
    console.log('🧪 TESTANDO DIFERENTES PHONE IDs...\n');
    
    for (const phoneId of possiblePhoneIds) {
      console.log(`📱 Testando Phone ID: ${phoneId}`);
      
      try {
        // Criar payload de teste
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
                          body: 'Teste Phone ID'
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
          },
          timeout: 10000
        });
        
        console.log(`✅ Status: ${response.status} - Phone ID ${phoneId} funcionou!`);
        
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log(`❌ Status: ${error.response.status} - Phone ID ${phoneId} inválido`);
        } else {
          console.log(`⚠️  Erro: ${error.message}`);
        }
      }
      
      console.log(''); // Linha em branco
    }
    
    // Tentar descobrir via logs do Vercel
    console.log('🔍 VERIFICANDO LOGS DO VERCEL...');
    console.log('📋 Acesse: https://vercel.com/dashboard');
    console.log('📋 Selecione: fintrack-backend-theta');
    console.log('📋 Vá em: Functions → webhook → View Function Logs');
    console.log('📋 Procure por erros de "Invalid Phone Number ID"');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

getPhoneIdViaVercel();
