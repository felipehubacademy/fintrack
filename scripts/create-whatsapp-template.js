import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Variáveis de ambiente
const PHONE_ID = process.env.PHONE_ID || process.env.WHATSAPP_PHONE_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

if (!PHONE_ID || !ACCESS_TOKEN) {
  console.error('❌ Credenciais WhatsApp não configuradas');
  console.error('   Necessário: PHONE_ID e WHATSAPP_TOKEN');
  process.exit(1);
}

/**
 * Criar template via WhatsApp Business API
 */
async function createTemplate() {
  try {
    console.log('🚀 Criando template via WhatsApp Business API...');
    console.log(`📱 Phone ID: ${PHONE_ID}`);
    console.log(`🔑 Token: ${ACCESS_TOKEN ? '***' + ACCESS_TOKEN.slice(-4) : 'não configurado'}`);
    
    // Obter WABA_ID do PHONE_ID
    let wabaId = WABA_ID;
    if (!wabaId || wabaId.includes('=')) {
      console.log('⚠️ WABA_ID não configurado corretamente, obtendo do PHONE_ID...');
      try {
        // Obter informações do número de telefone
        const phoneInfo = await axios.get(
          `${WHATSAPP_API_URL}/${PHONE_ID}?fields=verified_name,business_account_id`,
          {
            headers: {
              'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
          }
        );
        
        console.log('📄 Resposta da API:', JSON.stringify(phoneInfo.data, null, 2));
        
        wabaId = phoneInfo.data.verified_name?.business_account_id || 
                 phoneInfo.data.business_account_id;
        
        if (!wabaId) {
          // Tentar obter via edge endpoint
          const phoneInfo2 = await axios.get(
            `${WHATSAPP_API_URL}/${PHONE_ID}?fields=id,name,verified_name`,
            {
              headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
              }
            }
          );
          console.log('📄 Resposta alternativa:', JSON.stringify(phoneInfo2.data, null, 2));
        }
      } catch (error) {
        console.error('❌ Erro ao obter WABA_ID:', error.message);
        if (error.response) {
          console.error('📄 Detalhes:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // Se ainda não tiver, usar o valor conhecido da documentação
    if (!wabaId || wabaId.includes('=')) {
      console.log('💡 Usando WABA_ID da documentação: 1305894714600979');
      wabaId = '1305894714600979';
    }

    console.log(`📋 WABA ID: ${wabaId}`);

    // Template UTILITY minimalista (Versão 2 - Múltiplas Contas)
    // Usar nome único para evitar conflito com template MARKETING existente
    const templateData = {
      name: 'bill_reminder_utility_v2',
      category: 'UTILITY',
      language: 'pt_BR',
      components: [
        {
          type: 'BODY',
          text: `Contas a pagar vencendo

Vencimento: {{1}}
Quantidade: {{2}} conta(s)

{{3}}

Valor total: R$ {{4}}

Notificação automática.`,
          example: {
            body_text: [
              [
                '15/11/2025',
                '3',
                'Aluguel\nConta de Água\nConta de Luz',
                '450,00'
              ]
            ]
          }
        }
      ]
    };

    console.log('\n📝 Template a ser criado:');
    console.log(JSON.stringify(templateData, null, 2));

    // Criar template
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${wabaId}/message_templates`,
      templateData,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Template criado com sucesso!');
    console.log('📄 Resposta:', JSON.stringify(response.data, null, 2));
    
    if (response.data.id) {
      console.log(`\n🆔 Template ID: ${response.data.id}`);
      console.log(`📊 Status: ${response.data.status || 'PENDING'}`);
      console.log('\n💡 Aguarde a aprovação do WhatsApp (pode levar de 15 minutos a 24 horas)');
      console.log('💡 Use o script check-template-status.js para acompanhar o status');
    }

    return response.data;

  } catch (error) {
    console.error('\n❌ Erro ao criar template:', error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data?.error) {
        const errorData = error.response.data.error;
        console.error(`\n🔍 Código: ${errorData.code}`);
        console.error(`📝 Mensagem: ${errorData.message}`);
        
        if (errorData.error_subcode) {
          console.error(`🔍 Subcódigo: ${errorData.error_subcode}`);
        }
        
        if (errorData.error_user_title) {
          console.error(`📋 Título: ${errorData.error_user_title}`);
        }
        
        if (errorData.error_user_msg) {
          console.error(`💬 Mensagem: ${errorData.error_user_msg}`);
        }
      }
    }
    throw error;
  }
}

/**
 * Verificar status do template
 */
async function checkTemplateStatus(templateName = 'bill_reminder_utility') {
  try {
    let wabaId = WABA_ID;
    if (!wabaId) {
      // Tentar obter do PHONE_ID
      const phoneInfo = await axios.get(
        `${WHATSAPP_API_URL}/${PHONE_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        }
      );
      wabaId = phoneInfo.data.verified_name?.business_account_id || phoneInfo.data.business_account_id;
    }

    if (!wabaId) {
      console.error('❌ WABA_ID não encontrado');
      return;
    }

    // Listar templates
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${wabaId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        },
        params: {
          name: templateName
        }
      }
    );

    if (response.data.data && response.data.data.length > 0) {
      const template = response.data.data[0];
      console.log(`\n📋 Template encontrado: ${template.name}`);
      console.log(`📊 Status: ${template.status}`);
      console.log(`🆔 ID: ${template.id}`);
      console.log(`📂 Categoria: ${template.category}`);
      console.log(`🌐 Idioma: ${template.language}`);
      
      if (template.status === 'APPROVED') {
        console.log('\n✅ Template APROVADO! Pronto para uso.');
      } else if (template.status === 'PENDING') {
        console.log('\n⏳ Template PENDENTE de aprovação. Aguarde...');
      } else if (template.status === 'REJECTED') {
        console.log('\n❌ Template REJEITADO. Verifique os motivos acima.');
      }
      
      return template;
    } else {
      console.log(`\n⚠️ Template '${templateName}' não encontrado`);
      return null;
    }

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Executar
const command = process.argv[2];

if (command === 'check' || command === 'status') {
  const templateName = process.argv[3] || 'bill_reminder_utility';
  checkTemplateStatus(templateName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  createTemplate()
    .then(() => {
      // Aguardar 2 segundos e verificar status
      setTimeout(() => {
        checkTemplateStatus('bill_reminder_utility_v2')
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      }, 2000);
    })
    .catch(() => process.exit(1));
}

