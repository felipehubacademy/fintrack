import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

class OpenFinanceConnection {
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

  async getConnectors() {
    try {
      console.log('🔍 Buscando conectores...');
      
      const connectorsResponse = await fetch(`${PLUGGY_BASE_URL}/connectors`, {
        headers: { 'X-API-KEY': this.apiKey },
      });

      if (connectorsResponse.ok) {
        const connectorsData = await connectorsResponse.json();
        
        // Procurar por conectores Open Finance do Itaú
        const itauConnectors = connectorsData.results.filter(connector => 
          connector.name.toLowerCase().includes('itau') && 
          connector.name.toLowerCase().includes('open')
        );
        
        console.log(`📊 Encontrados ${itauConnectors.length} conectores Open Finance do Itaú:`);
        itauConnectors.forEach((connector, index) => {
          console.log(`   ${index + 1}. ID: ${connector.id} - ${connector.name}`);
        });
        
        return itauConnectors;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar conectores:', error.message);
    }
    return [];
  }

  async createOpenFinanceConnection(connectorId, credentials) {
    try {
      console.log('🏦 Criando conexão Open Finance...');
      
      const connectionResponse = await fetch(`${PLUGGY_BASE_URL}/items`, {
        method: 'POST',
        headers: { 
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectorId: connectorId,
          parameters: credentials,
          // Configurações específicas para Open Finance
          clientUserId: 'fintrack-user-' + Date.now(), // ID único do usuário
          webhook: 'https://fintrack-backend-theta.vercel.app/webhook/pluggy' // Webhook para notificações
        })
      });

      if (connectionResponse.ok) {
        const connectionData = await connectionResponse.json();
        console.log('✅ Conexão Open Finance criada!');
        console.log(`   ID: ${connectionData.id}`);
        console.log(`   Status: ${connectionData.status}`);
        console.log(`   Instituição: ${connectionData.connector?.name}`);
        
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

  async checkConnectionStatus(itemId) {
    try {
      const itemResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
        headers: { 'X-API-KEY': this.apiKey },
      });

      if (itemResponse.ok) {
        const itemData = await itemResponse.json();
        console.log('📊 Status da conexão:');
        console.log(`   ID: ${itemData.id}`);
        console.log(`   Status: ${itemData.status}`);
        console.log(`   Instituição: ${itemData.connector?.name}`);
        
        return itemData;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error.message);
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
          console.log('');
          console.log('🔥 Últimas transações:');
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
  const handler = new OpenFinanceConnection();
  
  // Autenticar
  if (!(await handler.authenticate())) {
    return;
  }
  
  // Buscar conectores Open Finance
  const connectors = await handler.getConnectors();
  
  if (connectors.length === 0) {
    console.log('❌ Nenhum conector Open Finance do Itaú encontrado');
    console.log('💡 Tentando conector padrão...');
    
    // Usar conector padrão do Itaú (ID: 201)
    const connection = await handler.createOpenFinanceConnection(201, {
      agency: '6493',
      account: '47186-3',
      password: '852369'
    });
    
    if (connection) {
      // Atualizar .env
      console.log('');
      console.log('🔧 Atualize seu .env com:');
      console.log(`PLUGGY_CONNECTION_ID=${connection.id}`);
    }
  } else {
    console.log('');
    console.log('🎯 Conectores Open Finance encontrados!');
    console.log('💡 Estes conectores são mais estáveis e não expiram');
    console.log('');
    console.log('📝 Para usar um conector Open Finance:');
    console.log('1. Escolha um dos IDs acima');
    console.log('2. Execute: node open-finance-connection.js <ID_DO_CONECTOR>');
  }
}

// Se passou ID do conector como argumento
if (process.argv[2]) {
  const connectorId = process.argv[2];
  
  async function createConnection() {
    const handler = new OpenFinanceConnection();
    
    if (await handler.authenticate()) {
      const connection = await handler.createOpenFinanceConnection(connectorId, {
        agency: '6493',
        account: '47186-3',
        password: '852369'
      });
      
      if (connection) {
        console.log('');
        console.log('🔧 Atualize seu .env com:');
        console.log(`PLUGGY_CONNECTION_ID=${connection.id}`);
        
        // Aguardar e verificar status
        console.log('');
        console.log('⏳ Aguardando 30 segundos para sincronização...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const status = await handler.checkConnectionStatus(connection.id);
        
        if (status && status.status === 'ACTIVE') {
          await handler.fetchTransactions(connection.id);
        }
      }
    }
  }
  
  createConnection();
} else {
  main();
}
