import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

class DirectConnection {
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

  async createConnectionWithRetry() {
    const credentials = {
      agency: '6493',
      account: '47186-3',
      password: '852369'
    };

    // Tentar diferentes abordagens
    const approaches = [
      {
        name: 'Método 1: Conexão padrão',
        connectorId: 201,
        parameters: credentials
      },
      {
        name: 'Método 2: Com clientUserId',
        connectorId: 201,
        parameters: credentials,
        clientUserId: `fintrack-${Date.now()}`
      },
      {
        name: 'Método 3: Com webhook',
        connectorId: 201,
        parameters: credentials,
        clientUserId: `fintrack-${Date.now()}`,
        webhook: 'https://fintrack-backend-theta.vercel.app/webhook/pluggy'
      },
      {
        name: 'Método 4: Conexão com timeout estendido',
        connectorId: 201,
        parameters: {
          ...credentials,
          timeout: 300 // 5 minutos
        }
      }
    ];

    for (const approach of approaches) {
      console.log(`\n🔄 Tentando: ${approach.name}`);
      
      try {
        const connectionResponse = await fetch(`${PLUGGY_BASE_URL}/items`, {
          method: 'POST',
          headers: { 
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            connectorId: approach.connectorId,
            parameters: approach.parameters,
            ...(approach.clientUserId && { clientUserId: approach.clientUserId }),
            ...(approach.webhook && { webhook: approach.webhook })
          })
        });

        if (connectionResponse.ok) {
          const connectionData = await connectionResponse.json();
          console.log(`✅ ${approach.name} - Sucesso!`);
          console.log(`   ID: ${connectionData.id}`);
          console.log(`   Status: ${connectionData.status}`);
          
          return connectionData;
        } else {
          const errorData = await connectionResponse.json();
          console.log(`❌ ${approach.name} - Erro:`, JSON.stringify(errorData, null, 2));
        }
      } catch (error) {
        console.log(`❌ ${approach.name} - Erro:`, error.message);
      }
    }

    return null;
  }

  async monitorConnection(itemId) {
    console.log(`\n🔍 Monitorando conexão ${itemId}...`);
    
    let attempts = 0;
    const maxAttempts = 20; // 10 minutos
    
    while (attempts < maxAttempts) {
      try {
        const itemResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
          headers: { 'X-API-KEY': this.apiKey },
        });

        if (itemResponse.ok) {
          const itemData = await itemResponse.json();
          console.log(`📊 Tentativa ${attempts + 1}: Status = ${itemData.status}`);
          
          if (itemData.status === 'ACTIVE') {
            console.log('🎉 CONEXÃO ATIVA!');
            return itemData;
          } else if (itemData.status === 'OUTDATED') {
            console.log('❌ Conexão expirada');
            return null;
          } else if (itemData.status === 'WAITING_USER_INPUT') {
            console.log('⚠️ Aguardando entrada do usuário...');
            
            // Se for WAITING_USER_INPUT, vamos tentar enviar parâmetros adicionais
            if (attempts === 5) {
              console.log('🔧 Tentando enviar parâmetros adicionais...');
              await this.tryAdditionalParameters(itemId);
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

  async tryAdditionalParameters(itemId) {
    try {
      console.log('🔧 Enviando parâmetros adicionais...');
      
      const updateResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameters: {
            agency: '6493',
            account: '47186-3',
            password: '852369',
            // Parâmetros adicionais que podem ajudar
            forceUpdate: true,
            skipMFA: false,
            timeout: 600
          }
        })
      });

      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        console.log('✅ Parâmetros adicionais enviados');
        console.log(`   Novo status: ${updateData.status}`);
        return updateData;
      } else {
        const errorData = await updateResponse.json();
        console.log('❌ Erro ao enviar parâmetros:', JSON.stringify(errorData, null, 2));
      }
    } catch (error) {
      console.error('❌ Erro ao enviar parâmetros:', error.message);
    }
    
    return null;
  }

  async fetchTransactions(itemId) {
    try {
      console.log('💰 Buscando transações...');
      
      const txResponse = await fetch(`${PLUGGY_BASE_URL}/transactions?itemId=${itemId}`, {
        headers: { 'X-API-KEY': this.apiKey },
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
        
        return txData.results || [];
      }
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error.message);
    }
    return [];
  }
}

// Função principal
async function main() {
  const handler = new DirectConnection();
  
  // Autenticar
  if (!(await handler.authenticate())) {
    return;
  }
  
  // Criar conexão com retry
  const connection = await handler.createConnectionWithRetry();
  
  if (!connection) {
    console.log('\n❌ Não foi possível criar nenhuma conexão');
    return;
  }
  
  console.log('\n🎯 Conexão criada!');
  console.log(`🔧 Atualize seu .env com:`);
  console.log(`PLUGGY_CONNECTION_ID=${connection.id}`);
  
  // Monitorar conexão
  const activeConnection = await handler.monitorConnection(connection.id);
  
  if (activeConnection) {
    // Buscar transações
    await handler.fetchTransactions(connection.id);
    
    console.log('\n🎉 SUCESSO! Sistema funcionando!');
  } else {
    console.log('\n⚠️ Conexão não ficou ativa, mas o ID foi salvo');
    console.log('💡 Tente novamente mais tarde ou verifique manualmente');
  }
}

main().catch(console.error);
