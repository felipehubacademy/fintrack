#!/usr/bin/env node

import axios from 'axios';

async function testWebhookVercel() {
  console.log('🧪 TESTANDO WEBHOOK NO VERCEL\n');

  const webhookUrl = 'https://fintrack-backend-theta.vercel.app/webhook';
  
  // Simular payload do WhatsApp
  const testPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "254587284410534",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "551151926165",
                phone_number_id: "787122227826364"
              },
              contacts: [
                {
                  profile: {
                    name: "Felipe Xavier"
                  },
                  wa_id: "5511978229898"
                }
              ],
              messages: [
                {
                  from: "5511978229898",
                  id: `wamid.test.${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: {
                    body: "Gastei 50 no mercado no débito para o Felipe"
                  },
                  type: "text"
                }
              ]
            },
            field: "messages"
          }
        ]
      }
    ]
  };

  const testMessages = [
    "Gastei 50 no mercado no débito para o Felipe",
    "Paguei 30 na farmácia",
    "Gastei 100", // Para testar perguntas sequenciais
    "Olá, como vai?" // Para testar rejeição
  ];

  console.log('📱 TESTANDO WEBHOOK COM DIFERENTES MENSAGENS:\n');

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TESTE ${i + 1}: "${message}"`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // Atualizar payload com mensagem atual
      testPayload.entry[0].changes[0].value.messages[0].text.body = message;
      testPayload.entry[0].changes[0].value.messages[0].id = `wamid.test.${Date.now()}`;
      
      console.log('📤 Enviando para webhook...');
      
      const response = await axios.post(webhookUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📄 Resposta: ${response.data}`);
      
      // Aguardar entre testes
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('❌ ERRO:', error.message);
      if (error.response) {
        console.error('📄 Status:', error.response.status);
        console.error('📄 Data:', error.response.data);
      }
    }
  }

  console.log('\n🎉 TESTE DO WEBHOOK CONCLUÍDO!');
  console.log('\n📊 VERIFIQUE:');
  console.log('1. Logs do Vercel para ver processamento');
  console.log('2. Banco de dados para ver despesas criadas');
  console.log('3. Dashboard para visualizar resultados');
}

// Executar teste
testWebhookVercel().catch(console.error);
