import dotenv from 'dotenv';
dotenv.config();

/**
 * Script de teste para templates WhatsApp
 * 
 * USO:
 * 1. Configure as variáveis no .env:
 *    - WHATSAPP_PHONE_NUMBER_ID
 *    - WHATSAPP_ACCESS_TOKEN
 * 
 * 2. Execute:
 *    node test-whatsapp-templates.js +5511999999999 "Felipe"
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

async function sendVerificationCode(phoneNumber, code) {
  console.log(`\n📱 Enviando código de verificação para ${phoneNumber}...`);
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'verification_code',
      language: {
        code: 'pt_BR'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: code
            }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: code
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Código enviado com sucesso!');
      console.log('📦 Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('❌ Erro ao enviar código:');
      console.error(JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

async function sendWelcomeMessage(phoneNumber, userName) {
  console.log(`\n👋 Enviando mensagem de boas-vindas para ${phoneNumber}...`);
  
  const firstName = userName.split(' ')[0];
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'welcome_verified',
      language: {
        code: 'pt_BR'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: firstName
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Mensagem de boas-vindas enviada com sucesso!');
      console.log('📦 Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.error('❌ Erro ao enviar boas-vindas:');
      console.error(JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
🧪 TESTE DE TEMPLATES WHATSAPP

USO:
  node test-whatsapp-templates.js <telefone> <nome>

EXEMPLO:
  node test-whatsapp-templates.js 5511999999999 "Felipe Xavier"

ATENÇÃO:
  - Telefone deve incluir código do país (55 para Brasil)
  - Nome será usado no template de boas-vindas
  - Templates devem estar aprovados no Meta Business Manager
    `);
    process.exit(1);
  }

  const phoneNumber = args[0].replace(/\D/g, ''); // Remove tudo que não é número
  const userName = args[1];

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ Erro: Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env');
    process.exit(1);
  }

  console.log('\n🚀 INICIANDO TESTES DE TEMPLATES');
  console.log('================================');
  console.log(`📱 Telefone: +${phoneNumber}`);
  console.log(`👤 Nome: ${userName}`);
  console.log(`🔑 Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`🔐 Access Token: ${ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('================================\n');

  // Gerar código de 6 dígitos aleatório
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔢 Código gerado: ${code}\n`);

  // Teste 1: Enviar código de verificação
  console.log('📋 TESTE 1: Template verification_code');
  const test1 = await sendVerificationCode(phoneNumber, code);
  
  if (!test1) {
    console.error('\n❌ TESTE 1 FALHOU - Abortando...');
    process.exit(1);
  }

  // Aguardar 5 segundos antes do próximo teste
  console.log('\n⏳ Aguardando 5 segundos...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Teste 2: Enviar mensagem de boas-vindas
  console.log('\n📋 TESTE 2: Template welcome_verified');
  const test2 = await sendWelcomeMessage(phoneNumber, userName);

  if (!test2) {
    console.error('\n❌ TESTE 2 FALHOU');
    process.exit(1);
  }

  console.log('\n================================');
  console.log('✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
  console.log('================================\n');
  console.log('📱 Verifique seu WhatsApp para confirmar o recebimento das mensagens.');
  console.log(`\n💡 Você deve ter recebido:`);
  console.log(`   1. Código de verificação: ${code}`);
  console.log(`   2. Mensagem: "Oi ${userName.split(' ')[0]}, aqui é o Zul! 👋..."`);
  console.log('');
}

main();

