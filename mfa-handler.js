import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

class PluggyMFAHandler {
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

  async sendMFAToken(itemId, mfaToken) {
    try {
      console.log('🔑 Enviando token MFA...');
      
      const mfaResponse = await fetch(`${PLUGGY_BASE_URL}/items/${itemId}/mfa`, {
        method: 'POST',
        headers: { 
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameter: mfaToken
        })
      });

      if (mfaResponse.ok) {
        const mfaData = await mfaResponse.json();
        console.log('✅ Token MFA enviado!');
        console.log(`   Status: ${mfaData.status}`);
        return mfaData;
      } else {
        const errorData = await mfaResponse.json();
        console.log('❌ Erro ao enviar MFA:', JSON.stringify(errorData, null, 2));
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar MFA:', error.message);
      return null;
    }
  }

  async waitForConnection(itemId, maxAttempts = 30) {
    console.log('⏳ Aguardando conexão ficar ativa...');
    
    for (let i = 0; i < maxAttempts; i++) {
      const connection = await this.checkConnectionStatus(itemId);
      
      if (connection) {
        if (connection.status === 'ACTIVE') {
          console.log('✅ Conexão ativa!');
          return connection;
        } else if (connection.status === 'WAITING_USER_INPUT') {
          console.log('⚠️ Ainda aguardando entrada do usuário...');
        } else if (connection.status === 'OUTDATED') {
          console.log('❌ Conexão expirada');
          return null;
        }
      }
      
      console.log(`⏳ Tentativa ${i + 1}/${maxAttempts} - Aguardando...`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
    }
    
    console.log('❌ Timeout - conexão não ficou ativa');
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
  const handler = new PluggyMFAHandler();
  
  // Autenticar
  if (!(await handler.authenticate())) {
    return;
  }
  
  const itemId = process.env.PLUGGY_CONNECTION_ID;
  
  // Verificar status atual
  const connection = await handler.checkConnectionStatus(itemId);
  
  if (!connection) {
    console.log('❌ Não foi possível verificar a conexão');
    return;
  }
  
  if (connection.status === 'WAITING_USER_INPUT') {
    console.log('');
    console.log('⚠️ Conexão aguardando entrada do usuário');
    console.log('💡 Isso geralmente significa que precisa de MFA');
    console.log('');
    console.log('📱 INSTRUÇÕES:');
    console.log('1. Verifique o app do Itaú');
    console.log('2. Procure por notificações de "Nova conexão"');
    console.log('3. Autorize o acesso do Pluggy');
    console.log('4. Se pedir token MFA, anote o código');
    console.log('');
    console.log('💡 Se receber um token MFA, execute:');
    console.log(`   node mfa-handler.js <TOKEN_MFA>`);
    
    // Aguardar conexão ficar ativa
    const activeConnection = await handler.waitForConnection(itemId);
    
    if (activeConnection) {
      await handler.fetchTransactions(itemId);
    }
    
  } else if (connection.status === 'ACTIVE') {
    console.log('✅ Conexão já está ativa!');
    await handler.fetchTransactions(itemId);
    
  } else {
    console.log(`⚠️ Status: ${connection.status}`);
  }
}

// Se passou token MFA como argumento
if (process.argv[2]) {
  const mfaToken = process.argv[2];
  
  async function sendMFA() {
    const handler = new PluggyMFAHandler();
    
    if (await handler.authenticate()) {
      await handler.sendMFAToken(process.env.PLUGGY_CONNECTION_ID, mfaToken);
      
      // Aguardar conexão ficar ativa
      await handler.waitForConnection(process.env.PLUGGY_CONNECTION_ID);
    }
  }
  
  sendMFA();
} else {
  main();
}
