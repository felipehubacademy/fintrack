import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

// Simular payload do WhatsApp quando usuário clica no botão
const mockWebhookPayload = {
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
                  "id": "wamid.HBgNNTUxMTk3ODIyOTg5OBUCABEYEkMzNTZEOTkzMzZEQkI2M0RGRQA="
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

console.log('🔍 Testando parsing do webhook...\n');

// Importar dinamicamente o parseButtonReply
import('./backend/services/whatsapp.js').then(({ parseButtonReply }) => {
  const result = parseButtonReply(mockWebhookPayload);
  
  console.log('📩 Payload recebido:', JSON.stringify(mockWebhookPayload, null, 2));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔘 Resultado do parsing:');
  console.log('   Owner:', result?.owner);
  console.log('   From:', result?.from);
  console.log('   Message ID:', result?.messageId);
  console.log('   Button Text:', result?.buttonText);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (result && result.owner) {
    console.log('✅ Parsing funcionou!');
    console.log(`✅ Owner detectado: ${result.owner}`);
    console.log(`📧 Message ID da resposta: ${result.messageId}`);
    console.log('\n⚠️ IMPORTANTE: O webhook precisa deste Message ID para buscar a transação no Supabase');
  } else {
    console.log('❌ Parsing falhou!');
    console.log('⚠️ O formato do payload pode estar diferente do esperado');
  }
}).catch(error => {
  console.error('❌ Erro ao importar:', error);
});

