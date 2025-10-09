import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

class ConnectionMonitor {
  constructor() {
    this.apiKey = null;
  }

  async authenticate() {
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
      this.apiKey = authData.apiKey;
      
      console.log('✅ Autenticado!');
      return true;
    } catch (error) {
      console.error('❌ Erro na autenticação:', error.message);
      return false;
    }
  }

  async createConnection() {
    try {
      console.log('🏦 Criando nova conexão...');
      
      const connectionResponse = await fetch(`${PLUGGY_BASE_URL}/items`, {
        method: 'POST',
        headers: { 
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectorId: 201, // Itaú
          parameters: {
            agency: '6493',
            account: '47186-3',
            password: '852369'
          }
        })
      });

      if (connectionResponse.ok) {
        const connectionData = await connectionResponse.json();
        console.log('✅ Conexão criada!');
        console.log(`   ID: ${connectionData.id}`);
        console.log(`   Status: ${connectionData.status}`);
        
        return connectionData;
      } else {
        const errorData = await connectionResponse.json();
        console.log('❌ Erro ao criar conexão:', JSON.stringify(errorData, null, 2));
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao criar conexão:', error.message);
      return null;
    }
  }

  async monitorConnection(itemId) {
    console.log(`\n🔍 Monitorando conexão ${itemId}...`);
    
    let attempts = 0;
    const maxAttempts = 60; // 30 minutos (30 segundos por tentativa)
    
    while (attempts < maxAttempts) {
      try {
        const itemResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
          headers: { 'X-API-KEY': this.apiKey },
        });

        if (itemResponse.ok) {
          const itemData = await itemResponse.json();
          const now = new Date().toLocaleTimeString('pt-BR');
          
          console.log(`\n⏰ ${now} - Tentativa ${attempts + 1}:`);
          console.log(`   Status: ${itemData.status}`);
          console.log(`   Execution Status: ${itemData.executionStatus || 'N/A'}`);
          
          if (itemData.status === 'ACTIVE') {
            console.log('🎉 CONEXÃO ATIVA!');
            return itemData;
            
          } else if (itemData.status === 'OUTDATED') {
            console.log('❌ Conexão expirada');
            return null;
            
          } else if (itemData.executionStatus === 'WAITING_USER_INPUT' || itemData.status === 'WAITING_USER_INPUT') {
            console.log('⚠️ AGUARDANDO ENTRADA DO USUÁRIO!');
            
            if (itemData.parameter) {
              console.log('\n📋 PARÂMETRO SOLICITADO:');
              console.log(JSON.stringify(itemData.parameter, null, 2));
              
              // Verificar tipo de parâmetro
              if (itemData.parameter.options) {
                console.log('\n📱 OPÇÕES DISPONÍVEIS:');
                itemData.parameter.options.forEach((option, index) => {
                  console.log(`   ${index + 1}. ${option.label || option.value || option}`);
                });
                
                console.log('\n💡 PARA ENVIAR UMA OPÇÃO:');
                console.log(`   node monitor-connection.js ${itemId} <OPÇÃO>`);
                
              } else if (itemData.parameter.type === 'text' || itemData.parameter.inputType === 'text') {
                console.log('\n📝 CAMPO DE TEXTO SOLICITADO:');
                console.log(`   Label: ${itemData.parameter.label || 'N/A'}`);
                console.log(`   Placeholder: ${itemData.parameter.placeholder || 'N/A'}`);
                
                console.log('\n💡 PARA ENVIAR UM VALOR:');
                console.log(`   node monitor-connection.js ${itemId} "<VALOR>"`);
              }
              
              // Verificar expiração
              if (itemData.parameter.expiresAt) {
                const expiresAt = new Date(itemData.parameter.expiresAt);
                const timeLeft = Math.round((expiresAt - new Date()) / 1000 / 60);
                
                console.log(`\n⏰ Expira em: ${expiresAt.toLocaleString('pt-BR')}`);
                console.log(`   Tempo restante: ${timeLeft} minutos`);
                
                if (timeLeft < 0) {
                  console.log('❌ PARÂMETRO EXPIRADO!');
                  return null;
                } else if (timeLeft < 2) {
                  console.log('⚠️ PARÂMETRO EXPIRANDO EM BREVE!');
                }
              }
              
              // Retornar para permitir envio manual do parâmetro
              return itemData;
            }
          }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 segundos
        
      } catch (error) {
        console.error('❌ Erro ao monitorar:', error.message);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    console.log('⏰ Timeout - conexão não ficou ativa');
    return null;
  }

  async sendParameter(itemId, parameterValue) {
    try {
      console.log(`🔑 Enviando parâmetro: ${parameterValue}`);
      
      const mfaResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}/mfa`, {
        method: 'POST',
        headers: { 
          'X-API-KEY': this.apiKey,
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
        
        return mfaData;
      } else {
        const errorData = await mfaResponse.json();
        console.log('❌ Erro ao enviar parâmetro:', JSON.stringify(errorData, null, 2));
        return null;
      }
      
    } catch (error) {
      console.error('❌ Erro ao enviar parâmetro:', error.message);
      return null;
    }
  }
}

// Função principal
async function main() {
  const monitor = new ConnectionMonitor();
  
  // Autenticar
  if (!(await monitor.authenticate())) {
    return;
  }
  
  // Se passou itemId e parâmetro como argumentos
  if (process.argv[2] && process.argv[3]) {
    const itemId = process.argv[2];
    const parameterValue = process.argv[3];
    
    await monitor.sendParameter(itemId, parameterValue);
    
    // Continuar monitorando após enviar parâmetro
    console.log('\n🔍 Continuando monitoramento...');
    await monitor.monitorConnection(itemId);
    
  } else {
    // Criar nova conexão e monitorar
    const connection = await monitor.createConnection();
    
    if (connection) {
      console.log('\n🔧 Atualize seu .env com:');
      console.log(`PLUGGY_CONNECTION_ID=${connection.id}`);
      
      // Monitorar conexão
      await monitor.monitorConnection(connection.id);
    }
  }
}

main().catch(console.error);
