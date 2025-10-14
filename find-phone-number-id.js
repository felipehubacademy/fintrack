import axios from 'axios';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Script para encontrar o Phone Number ID correto
async function findPhoneNumberId() {
  try {
    console.log('🔍 LOCALIZANDO PHONE NUMBER ID CORRETO...\n');
    
    const accountId = '1305894714600979'; // WhatsApp Business Account ID
    const phoneNumber = '+55 11 5192-8551'; // Número que queremos encontrar
    
    console.log(`🏢 Account ID: ${accountId}`);
    console.log(`📞 Número procurado: ${phoneNumber}\n`);
    
    // Usar token do .env
    const accessToken = process.env.WHATSAPP_TOKEN;
    
    if (!accessToken) {
      console.log('❌ ERRO: WHATSAPP_TOKEN não encontrado no .env!');
      console.log('📝 Configure o token no arquivo .env');
      return;
    }
    
    console.log(`🔑 Token encontrado: ${accessToken.substring(0, 20)}...`);
    
    // Buscar todos os números da conta
    console.log('📡 Buscando números da conta WhatsApp Business...');
    const response = await axios.get(`https://graph.facebook.com/v18.0/${accountId}/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Números encontrados na conta:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Procurar pelo número específico
    const numbers = response.data.data || [];
    const targetNumber = numbers.find(num => {
      const displayNumber = num.display_phone_number;
      // Comparar diferentes formatos
      return displayNumber === '551151928551' || 
             displayNumber === '+551151928551' ||
             displayNumber === '551151928551' ||
             displayNumber.includes('551151928551');
    });
    
    if (targetNumber) {
      console.log('\n✅ NÚMERO ENCONTRADO:');
      console.log(`📱 Phone Number ID: ${targetNumber.id}`);
      console.log(`📞 Display Number: ${targetNumber.display_phone_number}`);
      console.log(`✅ Status: ${targetNumber.status}`);
      console.log(`🌍 Quality Rating: ${targetNumber.quality_rating || 'N/A'}`);
      
      console.log('\n🔧 CONFIGURAÇÃO PARA O VERCEL:');
      console.log(`PHONE_ID = ${targetNumber.id}`);
      console.log(`WHATSAPP_TOKEN = ${accessToken}`);
      
      console.log('\n📋 ATUALIZE NO VERCEL:');
      console.log('1. Acesse: https://vercel.com/dashboard');
      console.log('2. Selecione: fintrack-backend-theta');
      console.log('3. Vá em: Settings → Environment Variables');
      console.log(`4. Atualize PHONE_ID para: ${targetNumber.id}`);
      
    } else {
      console.log('❌ Número não encontrado na conta');
      console.log('📋 Números disponíveis:');
      numbers.forEach(num => {
        console.log(`  - ID: ${num.id}, Número: ${num.display_phone_number}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar números:', error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

findPhoneNumberId();
