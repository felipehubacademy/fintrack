import axios from 'axios';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Script para descobrir o Phone Number ID REAL
async function discoverRealPhoneId() {
  try {
    console.log('🔍 DESCOBRINDO PHONE NUMBER ID REAL...\n');
    
    const accountId = '1305894714600979'; // WhatsApp Business Account ID
    
    console.log(`🏢 Account ID: ${accountId}`);
    console.log(`📞 Número procurado: +55 11 5192-8551\n`);
    
    // Usar token real fornecido
    const accessToken = 'EAAafO1sejkwBPlb4sr9MzpmIioVDxZA1GdizLTeb1cK6oIYucblY0BzCIs9ZAMinB6G5Gw8UWRyCfuwWtkind9dV2R8EZAX2EYvZBrGkp5s2ESjWHPLNnk0aoJTQP8ReUT7JDb2tvINvasc4YuctwYStJhanKKt52PBg8YieZC74U9kRBYeoIXCoixk2AVQZDZD';
    
    console.log(`🔑 Token: ${accessToken.substring(0, 20)}...\n`);
    
    // Buscar TODOS os números da conta
    console.log('📡 Buscando TODOS os números da conta...');
    const response = await axios.get(`https://graph.facebook.com/v18.0/${accountId}/phone_numbers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📋 RESPOSTA COMPLETA DA API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const numbers = response.data.data || [];
    
    if (numbers.length === 0) {
      console.log('❌ Nenhum número encontrado na conta!');
      return;
    }
    
    console.log('\n📱 NÚMEROS ENCONTRADOS NA CONTA:');
    numbers.forEach((num, index) => {
      console.log(`\n${index + 1}. Phone Number ID: ${num.id}`);
      console.log(`   Display Number: ${num.display_phone_number}`);
      console.log(`   Status: ${num.status}`);
      console.log(`   Quality: ${num.quality_rating || 'N/A'}`);
      console.log(`   Verified: ${num.verified_name || 'Não verificado'}`);
    });
    
    // Procurar pelo número específico
    console.log('\n🔍 PROCURANDO PELO NÚMERO +55 11 5192-8551...');
    const targetNumber = numbers.find(num => {
      const displayNumber = num.display_phone_number;
      return displayNumber === '551151928551' || 
             displayNumber === '+551151928551' ||
             displayNumber.includes('551151928551') ||
             displayNumber.includes('51928551');
    });
    
    if (targetNumber) {
      console.log('\n🎉 NÚMERO ENCONTRADO!');
      console.log(`📱 Phone Number ID: ${targetNumber.id}`);
      console.log(`📞 Display Number: ${targetNumber.display_phone_number}`);
      
      console.log('\n🔧 CONFIGURAÇÃO PARA O VERCEL:');
      console.log(`PHONE_ID = ${targetNumber.id}`);
      
      console.log('\n📋 ATUALIZE NO VERCEL:');
      console.log('1. https://vercel.com/dashboard');
      console.log('2. fintrack-backend-theta');
      console.log('3. Settings → Environment Variables');
      console.log(`4. PHONE_ID = ${targetNumber.id}`);
      
    } else {
      console.log('\n❌ Número +55 11 5192-8551 NÃO ENCONTRADO!');
      console.log('\n📋 Verifique se:');
      console.log('- O número está realmente aprovado na conta');
      console.log('- O token tem permissões para acessar números');
      console.log('- O número está ativo na conta WhatsApp Business');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📄 Detalhes:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error.code === 190) {
        console.log('\n🔧 SOLUÇÃO:');
        console.log('- Token inválido ou expirado');
        console.log('- Verifique se é o token da conta correta');
        console.log('- Certifique-se que o token tem permissões WhatsApp');
      }
    }
  }
}

discoverRealPhoneId();
