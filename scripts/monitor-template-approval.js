import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = '1305894714600979';
const TEMPLATE_NAME = 'bill_reminder_utility_v2';
const TEMPLATE_ID = '2275557932958238';

async function checkStatus() {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WABA_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        params: {
          name: TEMPLATE_NAME,
          limit: 10
        }
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      const template = response.data.data.find(t => t.id === TEMPLATE_ID || t.name === TEMPLATE_NAME);
      
      if (template) {
        const status = template.status;
        const emoji = status === 'APPROVED' ? '✅' : status === 'REJECTED' ? '❌' : '⏳';
        
        console.log(`${emoji} Template: ${template.name}`);
        console.log(`   Status: ${status}`);
        console.log(`   Categoria: ${template.category}`);
        console.log(`   ID: ${template.id}`);
        
        if (status === 'APPROVED') {
          console.log('\n🎉 Template APROVADO! Pronto para uso.');
          console.log('💡 Atualize o código para usar: bill_reminder_utility_v2');
          return true;
        } else if (status === 'REJECTED') {
          console.log('\n❌ Template REJEITADO.');
          if (template.rejection_reason) {
            console.log(`📝 Motivo: ${template.rejection_reason}`);
          }
          return false;
        } else {
          console.log('\n⏳ Ainda aguardando aprovação...');
          return null;
        }
      }
    }
    
    console.log('⚠️ Template não encontrado');
    return null;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Verificar status
checkStatus()
  .then(result => {
    if (result === true) {
      process.exit(0);
    } else if (result === false) {
      process.exit(1);
    } else {
      process.exit(2); // Ainda pendente
    }
  })
  .catch(() => process.exit(1));




