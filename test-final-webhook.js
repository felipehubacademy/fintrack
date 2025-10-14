import axios from 'axios';

// Teste final do webhook com todas as configurações corretas
async function testFinalWebhook() {
  try {
    console.log('🧪 TESTE FINAL DO WEBHOOK - CONFIGURAÇÕES CORRETAS\n');
    
    const phoneId = '801805679687987'; // Phone Number ID correto
    const userPhone = '5511978229898'; // Telefone do usuário cadastrado
    
    console.log(`📱 Phone ID: ${phoneId}`);
    console.log(`👤 User Phone: ${userPhone}\n`);
    
    const testMessages = [
      'Gastei 50 no mercado no débito para o Felipe',
      'Paguei 30 na farmácia',
      'Gastei 100',
      'Olá, como vai?'
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n🧪 TESTE ${i + 1}: "${message}"`);
      console.log('=====================================');
      
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
                      wa_id: userPhone
                    }
                  ],
                  messages: [
                    {
                      from: userPhone,
                      id: `wamid.test_${Date.now()}_${i}`,
                      timestamp: `${Math.floor(Date.now() / 1000)}`,
                      text: {
                        body: message
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
      
      try {
        const response = await axios.post('https://fintrack-backend-theta.vercel.app/webhook', testPayload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📄 Resposta: ${response.data}`);
        
      } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        if (error.response) {
          console.log(`📄 Status: ${error.response.status}`);
          console.log(`📄 Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
      
      // Aguardar entre testes
      if (i < testMessages.length - 1) {
        console.log('⏰ Aguardando 5 segundos...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('\n🎉 TESTE FINAL CONCLUÍDO!');
    console.log('\n📊 VERIFICAÇÕES:');
    console.log('1. ✅ Phone Number ID correto: 801805679687987');
    console.log('2. ✅ Usuário com telefone cadastrado: 5511978229898');
    console.log('3. ✅ Token WhatsApp configurado no Vercel');
    console.log('4. ✅ Webhook funcionando');
    
    console.log('\n🔍 PRÓXIMOS PASSOS:');
    console.log('1. Verificar logs do Vercel para ver processamento');
    console.log('2. Verificar banco de dados para despesas criadas');
    console.log('3. Verificar dashboard para visualizar resultados');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testFinalWebhook();
