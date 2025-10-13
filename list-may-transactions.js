import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/**
 * Listar transações de maio/2025
 */
async function listMayTransactions() {
  console.log('🔍 LISTANDO TRANSAÇÕES DE MAIO/2025');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Autenticar
    const authResponse = await axios.post(`${PLUGGY_BASE_URL}/auth`, {
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    });
    const apiKey = authResponse.data.apiKey;
    
    // 2. Buscar transações de maio/2025
    const accountId = process.env.PLUGGY_LATAM_ACCOUNT_ID;
    
    // Buscar todo o mês de maio
    const from = '2025-05-01';
    const to = '2025-05-31';
    
    console.log(`📅 Buscando transações de ${from} até ${to}...`);
    
    const transactionsResponse = await axios.get(
      `${PLUGGY_BASE_URL}/transactions`,
      {
        params: {
          accountId: accountId,
          from: from,
          to: to,
          pageSize: 500,
        },
        headers: {
          'X-API-KEY': apiKey,
        },
      }
    );
    
    const transactions = transactionsResponse.data.results;
    console.log(`✅ ${transactions.length} transações encontradas em maio/2025!`);
    
    if (transactions.length > 0) {
      console.log('\n📋 TODAS AS TRANSAÇÕES DE MAIO/2025:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      transactions.forEach((t, i) => {
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        const amount = Math.abs(parseFloat(t.amount));
        console.log(`${i + 1}. ${date} - ${t.description} - R$ ${amount.toFixed(2)}`);
        console.log(`   ID: ${t.id}`);
        console.log(`   Data ISO: ${t.date}`);
      });
      
      const total = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      console.log(`\n💰 TOTAL: R$ ${total.toFixed(2)}`);
      
      // Agora buscar abril também para o ciclo completo
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📅 Buscando transações de abril/2025 (para completar o ciclo)...');
      
      const aprilResponse = await axios.get(
        `${PLUGGY_BASE_URL}/transactions`,
        {
          params: {
            accountId: accountId,
            from: '2025-04-01',
            to: '2025-04-30',
            pageSize: 500,
          },
          headers: {
            'X-API-KEY': apiKey,
          },
        }
      );
      
      const aprilTransactions = aprilResponse.data.results;
      console.log(`✅ ${aprilTransactions.length} transações encontradas em abril/2025!`);
      
      // Filtrar abril de 9 em diante
      const aprilCycle = aprilTransactions.filter(t => {
        const date = new Date(t.date);
        return date.getDate() >= 9;
      });
      
      console.log(`📊 Transações de abril (dia 9 em diante): ${aprilCycle.length}`);
      
      if (aprilCycle.length > 0) {
        console.log('\n📋 TRANSAÇÕES DE ABRIL (DIA 9 EM DIANTE):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        aprilCycle.forEach((t, i) => {
          const date = new Date(t.date).toLocaleDateString('pt-BR');
          const amount = Math.abs(parseFloat(t.amount));
          console.log(`${i + 1}. ${date} - ${t.description} - R$ ${amount.toFixed(2)}`);
        });
      }
      
      // Filtrar maio até dia 8
      const mayCycle = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getDate() <= 8;
      });
      
      console.log(`\n📊 Transações de maio (até dia 8): ${mayCycle.length}`);
      
      if (mayCycle.length > 0) {
        console.log('\n📋 TRANSAÇÕES DE MAIO (ATÉ DIA 8):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        mayCycle.forEach((t, i) => {
          const date = new Date(t.date).toLocaleDateString('pt-BR');
          const amount = Math.abs(parseFloat(t.amount));
          console.log(`${i + 1}. ${date} - ${t.description} - R$ ${amount.toFixed(2)}`);
        });
      }
      
      // Total do ciclo
      const cycleTransactions = [...aprilCycle, ...mayCycle];
      const cycleTotal = cycleTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💰 CICLO COMPLETO (09/ABR a 08/MAI):');
      console.log(`📊 Total de transações: ${cycleTransactions.length}`);
      console.log(`💵 Total: R$ ${cycleTotal.toFixed(2)}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
    } else {
      console.log('⚠️ Nenhuma transação encontrada em maio/2025');
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
listMayTransactions();
