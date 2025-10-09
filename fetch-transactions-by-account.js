import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

async function fetchTransactionsByAccount() {
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
    
    const itemId = process.env.PLUGGY_CONNECTION_ID;
    console.log(`🔍 Buscando dados para conexão: ${itemId}`);
    
    // 1. Buscar contas
    console.log('\n🏦 Buscando contas...');
    const accountsResponse = await fetch(`${PLUGGY_BASE_URL}/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    
    if (!accountsResponse.ok) {
      console.log('❌ Erro ao buscar contas');
      return;
    }
    
    const accountsData = await accountsResponse.json();
    const accounts = accountsData.results || [];
    
    console.log(`✅ ${accounts.length} contas encontradas:`);
    accounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.name} - ${account.type} - R$ ${account.balance?.toFixed(2) || 'N/A'} (ID: ${account.id})`);
    });
    
    // 2. Buscar transações para cada conta
    console.log('\n💰 Buscando transações por conta...');
    
    let totalTransactions = 0;
    
    for (const account of accounts) {
      console.log(`\n📊 Conta: ${account.name} (${account.type})`);
      
      try {
        const txResponse = await fetch(`${PLUGGY_BASE_URL}/transactions?itemId=${itemId}&accountId=${account.id}`, {
          headers: { 'X-API-KEY': apiKey },
        });
        
        if (txResponse.ok) {
          const txData = await txResponse.json();
          const transactions = txData.results || [];
          
          console.log(`   📈 ${transactions.length} transações encontradas`);
          totalTransactions += transactions.length;
          
          if (transactions.length > 0) {
            console.log('   🔥 Últimas transações:');
            transactions.slice(0, 3).forEach((tx, i) => {
              const date = new Date(tx.date).toLocaleDateString('pt-BR');
              const amount = tx.amount > 0 ? `+R$ ${tx.amount.toFixed(2)}` : `R$ ${tx.amount.toFixed(2)}`;
              console.log(`      ${i + 1}. [${date}] ${tx.description} - ${amount}`);
            });
          }
          
        } else {
          const errorData = await txResponse.json();
          console.log(`   ❌ Erro: ${errorData.message || 'Erro desconhecido'}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao buscar transações: ${error.message}`);
      }
    }
    
    console.log(`\n📊 RESUMO:`);
    console.log(`   🏦 Contas: ${accounts.length}`);
    console.log(`   💰 Transações totais: ${totalTransactions}`);
    
    if (totalTransactions > 0) {
      console.log('\n🎉 SISTEMA FUNCIONANDO PERFEITAMENTE!');
      console.log('✅ Pluggy conectado');
      console.log('✅ Contas encontradas');
      console.log('✅ Transações sendo buscadas');
      console.log('✅ Pronto para salvar no Supabase e enviar WhatsApp');
    } else {
      console.log('\n⏳ Nenhuma transação encontrada ainda');
      console.log('💡 Aguarde mais alguns minutos para sincronização completa');
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

fetchTransactionsByAccount();
