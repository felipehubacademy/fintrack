import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

const PHONE_ID = process.env.PHONE_ID || process.env.WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = '1305894714600979'; // Da documentação

async function listTemplates() {
  try {
    console.log('🔍 Listando templates existentes...\n');

    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WABA_ID}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        params: {
          limit: 100
        }
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      console.log(`📋 Total de templates: ${response.data.data.length}\n`);
      
      response.data.data.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name}`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Categoria: ${template.category}`);
        console.log(`   Idioma: ${template.language}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Criado: ${template.created_at || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum template encontrado');
    }

    return response.data.data || [];

  } catch (error) {
    console.error('❌ Erro ao listar templates:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

listTemplates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));


