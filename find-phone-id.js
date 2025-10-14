import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = '1305894714600979'; // Novo número aprovado
const ACCESS_TOKEN = process.env.WHATSAPP_TOKEN; // Seu token de acesso

async function findPhoneId() {
  try {
    console.log('🔍 LOCALIZANDO ID DO NÚMERO WHATSAPP...\n');
    console.log(`📱 Número aprovado: ${PHONE_NUMBER_ID}`);
    console.log(`🔑 Token: ${ACCESS_TOKEN ? 'Configurado' : 'NÃO CONFIGURADO'}\n`);

    if (!ACCESS_TOKEN) {
      console.error('❌ WHATSAPP_TOKEN não configurado no .env');
      console.log('📝 Configure o token no arquivo .env ou .env.local');
      return;
    }

    // Buscar informações do número
    console.log('📡 Buscando informações do número...');
    const response = await axios.get(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Informações do número:');
    console.log(JSON.stringify(response.data, null, 2));

    // Buscar números disponíveis na conta
    console.log('\n📡 Buscando todos os números da conta...');
    const accountResponse = await axios.get(`${WHATSAPP_API_URL}/me/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Números disponíveis na conta:');
    console.log(JSON.stringify(accountResponse.data, null, 2));

    // Procurar pelo número específico
    const phoneNumber = '551151928551'; // +55 11 5192-8551 formatado
    console.log(`\n🔍 Procurando pelo número: ${phoneNumber}`);
    
    const numbers = accountResponse.data.data || [];
    const foundNumber = numbers.find(num => 
      num.display_phone_number === phoneNumber || 
      num.display_phone_number === '+551151928551' ||
      num.id === PHONE_NUMBER_ID
    );

    if (foundNumber) {
      console.log('✅ NÚMERO ENCONTRADO:');
      console.log(`📱 ID: ${foundNumber.id}`);
      console.log(`📞 Número: ${foundNumber.display_phone_number}`);
      console.log(`✅ Verificado: ${foundNumber.verified_name || 'Não verificado'}`);
      console.log(`🌍 Qualidade: ${foundNumber.quality_rating || 'N/A'}`);
    } else {
      console.log('❌ Número não encontrado na lista');
    }

  } catch (error) {
    console.error('❌ Erro ao buscar informações:', error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

findPhoneId();
