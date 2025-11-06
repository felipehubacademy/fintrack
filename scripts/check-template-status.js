import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

const PHONE_ID = process.env.PHONE_ID || process.env.WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
let WABA_ID = process.env.WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

// Limpar WABA_ID se contiver caracteres inválidos
if (WABA_ID && (WABA_ID.includes('=') || WABA_ID.length > 20)) {
  WABA_ID = null;
}

// Usar WABA_ID da documentação se não configurado
if (!WABA_ID) {
  WABA_ID = '1305894714600979';
}

async function checkTemplateStatus(templateName = 'bill_reminder_utility_v2') {
  try {
    console.log(`🔍 Verificando status do template: ${templateName}`);
    
    let wabaId = WABA_ID;
    if (!wabaId || wabaId.includes('=')) {
      console.log('⚠️ WABA_ID não configurado, tentando obter do PHONE_ID...');
      try {
        const phoneInfo = await axios.get(
          `${WHATSAPP_API_URL}/${PHONE_ID}`,
          {
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
          }
        );
        wabaId = phoneInfo.data.verified_name?.business_account_id || phoneInfo.data.business_account_id;
        console.log(`✅ WABA ID obtido: ${wabaId}`);
      } catch (error) {
        console.error('❌ Erro ao obter WABA_ID:', error.message);
        console.error('💡 Configure WABA_ID manualmente');
        process.exit(1);
      }
    }

    // Listar todos os templates
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${wabaId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        params: {
          limit: 100
        }
      }
    );

    console.log(`\n📋 Total de templates encontrados: ${response.data.data?.length || 0}`);

    if (response.data.data && response.data.data.length > 0) {
      // Procurar template específico
      const template = response.data.data.find(t => t.name === templateName);
      
      if (template) {
        console.log(`\n✅ Template encontrado: ${template.name}`);
        console.log(`📊 Status: ${template.status}`);
        console.log(`🆔 ID: ${template.id}`);
        console.log(`📂 Categoria: ${template.category}`);
        console.log(`🌐 Idioma: ${template.language}`);
        console.log(`📅 Criado em: ${template.created_at || 'N/A'}`);
        
        if (template.status === 'APPROVED') {
          console.log('\n✅ Template APROVADO! Pronto para uso.');
          return { approved: true, template };
        } else if (template.status === 'PENDING') {
          console.log('\n⏳ Template PENDENTE de aprovação. Aguarde...');
          return { approved: false, status: 'PENDING', template };
        } else if (template.status === 'REJECTED') {
          console.log('\n❌ Template REJEITADO.');
          if (template.rejection_reason) {
            console.log(`📝 Motivo: ${template.rejection_reason}`);
          }
          return { approved: false, status: 'REJECTED', template };
        }
      } else {
        console.log(`\n⚠️ Template '${templateName}' não encontrado`);
        console.log('\n📋 Templates disponíveis:');
        response.data.data.forEach(t => {
          console.log(`   - ${t.name} (${t.status}) - ${t.category}`);
        });
        return { approved: false, status: 'NOT_FOUND' };
      }
    } else {
      console.log('\n⚠️ Nenhum template encontrado');
      return { approved: false, status: 'NOT_FOUND' };
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

const templateName = process.argv[2] || 'bill_reminder_utility_v2';
checkTemplateStatus(templateName)
  .then(result => {
    process.exit(result?.approved ? 0 : 1);
  })
  .catch(() => process.exit(1));

