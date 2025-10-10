import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

async function checkAllTransactions() {
  try {
    // 1. Autenticar
    console.log('🔐 Autenticando na Pluggy...');
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
    
    console.log('✅ Autenticado!\n');

    // 2. Buscar todas as contas
    console.log('📊 Buscando contas...');
    const accountsResponse = await fetch(
      `${PLUGGY_BASE_URL}/items/${process.env.PLUGGY_CONNECTION_ID}/accounts`,
      {
        headers: { 'X-API-KEY': apiKey },
      }
    );
    const accountsData = await accountsResponse.json();

    console.log(`✅ ${accountsData.results.length} contas encontradas\n`);

    // 3. Para cada conta, buscar transações
    for (const account of accountsData.results) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 CONTA: ${account.name}`);
      console.log(`   Tipo: ${account.type}`);
      console.log(`   ID: ${account.id}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      const transactionsResponse = await fetch(
        `${PLUGGY_BASE_URL}/accounts/${account.id}/transactions`,
        {
          headers: { 'X-API-KEY': apiKey },
        }
      );
      const transactionsData = await transactionsResponse.json();

      if (transactionsData.results && transactionsData.results.length > 0) {
        console.log(`✅ ${transactionsData.results.length} transações encontradas\n`);
        
        // Pegar a primeira transação como exemplo
        const firstTransaction = transactionsData.results[0];
        
        console.log('📋 ESTRUTURA DA PRIMEIRA TRANSAÇÃO:\n');
        console.log(JSON.stringify(firstTransaction, null, 2));
        
        console.log('\n🔑 CAMPOS DISPONÍVEIS:\n');
        Object.keys(firstTransaction).forEach(key => {
          const value = firstTransaction[key];
          console.log(`  • ${key}: ${JSON.stringify(value)}`);
        });

        console.log('\n📊 PRIMEIRAS 3 TRANSAÇÕES:\n');
        transactionsData.results.slice(0, 3).forEach((t, i) => {
          console.log(`${i + 1}. ${t.description} - R$ ${t.amount} (${t.date})`);
        });

        break; // Só precisamos de uma conta com transações
      } else {
        console.log('⚠️ Nenhuma transação nesta conta');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  }
}

checkAllTransactions();
