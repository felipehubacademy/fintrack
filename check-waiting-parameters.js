import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

async function checkWaitingParameters() {
  try {
    console.log('🔐 Autenticando...');
    
    const authResponse = await fetch(`${PLUGGY_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.PLUGGY_CLIENT_ID,
        clientSecret: process.env.PLUGGY_CLIENT_SECRET,
      }),
    });

    const authData = await authResponse.json();
    const apiKey = authData.apiKey;
    
    console.log('✅ Autenticado!');
    
    // Verificar status da conexão atual
    const itemId = process.env.PLUGGY_CONNECTION_ID;
    console.log(`🔍 Verificando conexão ${itemId}...`);
    
    const itemResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (itemResponse.ok) {
      const itemData = await itemResponse.json();
      console.log('📊 Status da conexão:');
      console.log(`   ID: ${itemData.id}`);
      console.log(`   Status: ${itemData.status}`);
      console.log(`   Execution Status: ${itemData.executionStatus || 'N/A'}`);
      console.log(`   Instituição: ${itemData.connector?.name}`);
      
      // Verificar se há parâmetros esperando entrada
      if (itemData.executionStatus === 'WAITING_USER_INPUT' || itemData.status === 'WAITING_USER_INPUT') {
        console.log('\n⚠️ CONEXÃO AGUARDANDO ENTRADA DO USUÁRIO!');
        
        // Verificar se há parâmetros na resposta
        if (itemData.parameter) {
          console.log('📋 Parâmetro solicitado:');
          console.log(JSON.stringify(itemData.parameter, null, 2));
          
          // Verificar se há opções disponíveis
          if (itemData.parameter.options) {
            console.log('\n📱 Opções disponíveis:');
            itemData.parameter.options.forEach((option, index) => {
              console.log(`   ${index + 1}. ${option.label || option.value || option}`);
            });
            
            console.log('\n💡 Para enviar uma opção, execute:');
            console.log(`   node check-waiting-parameters.js <OPÇÃO>`);
          }
          
          // Verificar se é um campo de texto
          if (itemData.parameter.type === 'text' || itemData.parameter.inputType === 'text') {
            console.log('\n📝 Campo de texto solicitado:');
            console.log(`   Tipo: ${itemData.parameter.type || itemData.parameter.inputType}`);
            console.log(`   Label: ${itemData.parameter.label || 'N/A'}`);
            console.log(`   Placeholder: ${itemData.parameter.placeholder || 'N/A'}`);
            
            console.log('\n💡 Para enviar um valor, execute:');
            console.log(`   node check-waiting-parameters.js "<VALOR>"`);
          }
          
          // Verificar expiração
          if (itemData.parameter.expiresAt) {
            const expiresAt = new Date(itemData.parameter.expiresAt);
            const now = new Date();
            const timeLeft = Math.round((expiresAt - now) / 1000 / 60);
            
            console.log(`\n⏰ Expira em: ${expiresAt.toLocaleString('pt-BR')}`);
            console.log(`   Tempo restante: ${timeLeft} minutos`);
            
            if (timeLeft < 0) {
              console.log('❌ Parâmetro expirado!');
            } else if (timeLeft < 5) {
              console.log('⚠️ Parâmetro expirando em breve!');
            }
          }
          
        } else {
          console.log('❌ Nenhum parâmetro específico encontrado na resposta');
          console.log('📋 Resposta completa:');
          console.log(JSON.stringify(itemData, null, 2));
        }
        
      } else if (itemData.status === 'ACTIVE') {
        console.log('\n✅ Conexão já está ativa!');
        
        // Buscar transações
        console.log('\n💰 Buscando transações...');
        const txResponse = await fetch(`${PLUGGY_BASE_URL}/transactions?itemId=${itemData.id}`, {
          headers: { 'X-API-KEY': apiKey },
        });
        
        if (txResponse.ok) {
          const txData = await txResponse.json();
          console.log(`📊 Encontradas ${txData.results?.length || 0} transações!`);
          
          if (txData.results && txData.results.length > 0) {
            console.log('\n🔥 Últimas transações:');
            txData.results.slice(0, 5).forEach((tx, i) => {
              console.log(`   ${i + 1}. ${tx.description} - R$ ${tx.amount.toFixed(2)}`);
            });
          }
        }
        
      } else {
        console.log(`\n⚠️ Status: ${itemData.status}`);
        console.log(`   Execution Status: ${itemData.executionStatus || 'N/A'}`);
      }
      
    } else {
      console.log('❌ Erro ao verificar conexão');
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

// Se passou parâmetro como argumento, enviar via MFA
if (process.argv[2]) {
  const parameterValue = process.argv[2];
  
  async function sendMFAParameter() {
    try {
      console.log('🔐 Autenticando...');
      
      const authResponse = await fetch(`${PLUGGY_BASE_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: process.env.PLUGGY_CLIENT_ID,
          clientSecret: process.env.PLUGGY_CLIENT_SECRET,
        }),
      });

      const authData = await authResponse.json();
      const apiKey = authData.apiKey;
      
      console.log('✅ Autenticado!');
      
      const itemId = process.env.PLUGGY_CONNECTION_ID;
      console.log(`🔑 Enviando parâmetro: ${parameterValue}`);
      
      const mfaResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}/mfa`, {
        method: 'POST',
        headers: { 
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameter: parameterValue
        })
      });

      if (mfaResponse.ok) {
        const mfaData = await mfaResponse.json();
        console.log('✅ Parâmetro enviado!');
        console.log(`   Status: ${mfaData.status || 'N/A'}`);
        console.log(`   Execution Status: ${mfaData.executionStatus || 'N/A'}`);
        
        if (mfaData.status === 'ACTIVE') {
          console.log('🎉 Conexão ativa!');
        } else if (mfaData.executionStatus === 'WAITING_USER_INPUT') {
          console.log('⚠️ Ainda aguardando entrada do usuário');
          console.log('💡 Verifique se há outros parâmetros necessários');
        }
        
      } else {
        const errorData = await mfaResponse.json();
        console.log('❌ Erro ao enviar parâmetro:', JSON.stringify(errorData, null, 2));
      }
      
    } catch (error) {
      console.error('❌ ERRO:', error.message);
    }
  }
  
  sendMFAParameter();
} else {
  checkWaitingParameters();
}
