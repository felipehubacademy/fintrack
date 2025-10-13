import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/**
 * Buscar TODAS as transações com range de data
 */
async function fetchAllTransactions() {
  console.log('🔍 BUSCANDO TODAS AS TRANSAÇÕES COM RANGE DE DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Autenticar
    console.log('🔑 Autenticando na Pluggy...');
    const authResponse = await axios.post(`${PLUGGY_BASE_URL}/auth`, {
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    });
    const apiKey = authResponse.data.apiKey;
    console.log('✅ Autenticado!');
    
    // 2. Buscar transações com range de data (último ano)
    const accountId = process.env.PLUGGY_LATAM_ACCOUNT_ID;
    
    // Range: 1 de janeiro de 2025 até hoje
    const from = '2025-01-01';
    const to = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Buscando transações de ${from} até ${to}...`);
    console.log(`📊 Account ID: ${accountId}`);
    
    const transactionsResponse = await axios.get(
      `${PLUGGY_BASE_URL}/transactions`,
      {
        params: {
          accountId: accountId,
          from: from,
          to: to,
          pageSize: 500, // Máximo permitido
        },
        headers: {
          'X-API-KEY': apiKey,
        },
      }
    );
    
    const transactions = transactionsResponse.data.results;
    console.log(`✅ ${transactions.length} transações encontradas!`);
    
    // Agrupar por mês
    const monthGroups = {};
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(t);
    });
    
    console.log('\n📊 TRANSAÇÕES POR MÊS (2025):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(monthGroups).sort().forEach(([month, txs]) => {
      const total = txs.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      console.log(`${month}: ${txs.length} transações - Total: R$ ${total.toFixed(2)}`);
    });
    
    // Filtrar maio/2025 (ciclo: 9 de abril a 8 de maio)
    const mayTransactions = transactions.filter(t => {
      const date = t.date;
      return date >= '2025-04-09' && date <= '2025-05-08';
    });
    
    if (mayTransactions.length > 0) {
      console.log('\n📋 TRANSAÇÕES DO CICLO MAIO/2025 (09/abr a 08/mai):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      mayTransactions.forEach((t, i) => {
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        const amount = Math.abs(parseFloat(t.amount));
        console.log(`${i + 1}. ${date} - ${t.description} - R$ ${amount.toFixed(2)}`);
      });
      
      const total = mayTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      console.log(`\n💰 TOTAL MAIO/2025: R$ ${total.toFixed(2)}`);
    } else {
      console.log('\n⚠️ Nenhuma transação encontrada no ciclo de maio/2025');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar
fetchAllTransactions();
