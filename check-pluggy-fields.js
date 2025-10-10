import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

async function checkTransactionFields() {
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

    // 2. Buscar transações
    console.log('📊 Buscando transações do LATAM...');
    const transactionsResponse = await fetch(
      `${PLUGGY_BASE_URL}/accounts/${process.env.PLUGGY_LATAM_ACCOUNT_ID}/transactions`,
      {
        headers: { 'X-API-KEY': apiKey },
      }
    );
    const transactionsData = await transactionsResponse.json();

    if (transactionsData.results && transactionsData.results.length > 0) {
      console.log(`✅ ${transactionsData.results.length} transações encontradas\n`);
      
      // Pegar a primeira transação como exemplo
      const firstTransaction = transactionsData.results[0];
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 ESTRUTURA COMPLETA DE UMA TRANSAÇÃO:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(JSON.stringify(firstTransaction, null, 2));
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 CAMPOS DISPONÍVEIS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      Object.keys(firstTransaction).forEach(key => {
        const value = firstTransaction[key];
        const type = typeof value;
        console.log(`  • ${key}: ${type} = ${JSON.stringify(value)}`);
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 EXEMPLOS DE TRANSAÇÕES (primeiras 5):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      transactionsData.results.slice(0, 5).forEach((t, i) => {
        console.log(`${i + 1}. ${t.description}`);
        console.log(`   ID: ${t.id}`);
        console.log(`   Valor: R$ ${t.amount}`);
        console.log(`   Data: ${t.date}`);
        console.log(`   Type: ${t.type || 'N/A'}`);
        console.log(`   Category: ${t.category || 'N/A'}`);
        console.log(`   Payment Method: ${t.paymentMethod || 'N/A'}`);
        console.log(`   Card Number: ${t.cardNumber || 'N/A'}`);
        console.log(`   Merchant: ${JSON.stringify(t.merchant || 'N/A')}`);
        console.log(`   Payment Data: ${JSON.stringify(t.paymentData || 'N/A')}`);
        console.log('');
      });

    } else {
      console.log('❌ Nenhuma transação encontrada');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkTransactionFields();
