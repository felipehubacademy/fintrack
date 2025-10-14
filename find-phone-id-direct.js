import axios from 'axios';

// Script para encontrar Phone Number ID usando token direto
async function findPhoneNumberIdDirect() {
  try {
    console.log('🔍 LOCALIZANDO PHONE NUMBER ID VIA API DIRETA...\n');
    
    const accountId = '1305894714600979'; // WhatsApp Business Account ID
    
    // VOCÊ PRECISA COLOCAR SEU TOKEN REAL AQUI
    const accessToken = 'COLE_SEU_TOKEN_AQUI';
    
    if (accessToken === 'COLE_SEU_TOKEN_AQUI') {
      console.log('❌ ERRO: Você precisa colar seu token real aqui!');
      console.log('📝 Substitua "COLE_SEU_TOKEN_AQUI" pelo token da nova conta');
      console.log('\n🔍 ONDE ENCONTRAR O TOKEN:');
      console.log('1. https://developers.facebook.com/');
      console.log('2. Selecione sua app WhatsApp Business');
      console.log('3. WhatsApp → API Setup');
      console.log('4. Copie o Access Token');
      return;
    }
    
    console.log(`🏢 Account ID: ${accountId}`);
    console.log(`🔑 Token: ${accessToken.substring(0, 20)}...\n`);
    
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
             displayNumber.includes('551151928551') ||
             displayNumber.includes('51928551');
    });
    
    if (targetNumber) {
      console.log('\n🎉 NÚMERO ENCONTRADO!');
      console.log(`📱 Phone Number ID: ${targetNumber.id}`);
      console.log(`📞 Display Number: ${targetNumber.display_phone_number}`);
      console.log(`✅ Status: ${targetNumber.status}`);
      console.log(`🌍 Quality Rating: ${targetNumber.quality_rating || 'N/A'}`);
      
      console.log('\n🔧 CONFIGURAÇÃO PARA O VERCEL:');
      console.log(`PHONE_ID = ${targetNumber.id}`);
      
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. Acesse: https://vercel.com/dashboard');
      console.log('2. Selecione: fintrack-backend-theta');
      console.log('3. Vá em: Settings → Environment Variables');
      console.log(`4. Atualize PHONE_ID para: ${targetNumber.id}`);
      console.log('5. Faça redeploy da aplicação');
      
    } else {
      console.log('❌ Número +55 11 5192-8551 não encontrado na conta');
      console.log('📋 Números disponíveis na conta:');
      numbers.forEach(num => {
        console.log(`  - ID: ${num.id}`);
        console.log(`    Número: ${num.display_phone_number}`);
        console.log(`    Status: ${num.status}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar números:', error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error.code === 190) {
        console.log('\n🔧 SOLUÇÃO:');
        console.log('1. Verifique se o token está correto');
        console.log('2. Certifique-se que é o token da nova conta WhatsApp Business');
        console.log('3. O token deve ter permissões para acessar números de telefone');
      }
    }
  }
}

findPhoneNumberIdDirect();
