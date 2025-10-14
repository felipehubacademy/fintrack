import axios from 'axios';

// Script para testar Phone IDs e ver detalhes dos logs
async function testPhoneIdDetails() {
  try {
    console.log('🧪 TESTANDO PHONE IDs COM DETALHES...\n');
    
    const phoneIds = [
      '1305894714600979', // Account ID
      '787122227826364'   // Phone ID antigo
    ];
    
    for (const phoneId of phoneIds) {
      console.log(`📱 TESTANDO PHONE ID: ${phoneId}`);
      console.log('=====================================');
      
      try {
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
                          name: 'Felipe Xavier'
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
                          body: `Teste Phone ID ${phoneId}`
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
          timeout: 15000
        });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📄 Resposta: ${response.data}`);
        console.log(`⏰ Aguardando 5 segundos para processar...\n`);
        
        // Aguardar para o processamento
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        if (error.response) {
          console.log(`📄 Status: ${error.response.status}`);
          console.log(`📄 Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        console.log('');
      }
    }
    
    console.log('🔍 VERIFICAÇÃO DOS LOGS:');
    console.log('📋 Acesse: https://vercel.com/dashboard');
    console.log('📋 Selecione: fintrack-backend-theta');
    console.log('📋 Vá em: Functions → webhook → View Function Logs');
    console.log('📋 Procure por:');
    console.log('   - "Erro ao buscar usuário" (usuário não encontrado)');
    console.log('   - "Erro ao enviar mensagem" (problema WhatsApp)');
    console.log('   - "Invalid Test Phone Number" (número de teste)');
    console.log('   - "Invalid Phone Number ID" (Phone ID inválido)');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testPhoneIdDetails();
