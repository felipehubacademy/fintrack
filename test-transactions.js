import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

async function testTransactions() {
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
    console.log(`🔍 Testando busca de dados para conexão: ${itemId}`);
    
    // Tentar buscar transações mesmo com status UPDATED
    console.log('\n💰 Tentando buscar transações...');
    const txResponse = await fetch(`${PLUGGY_BASE_URL}/transactions?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    
    if (txResponse.ok) {
      const txData = await txResponse.json();
      console.log(`📊 Resposta: ${txData.results?.length || 0} transações`);
      
      if (txData.results && txData.results.length > 0) {
        console.log('\n🎉 TRANSACÕES ENCONTRADAS!');
        console.log('🔥 Últimas transações:');
        txData.results.slice(0, 5).forEach((tx, i) => {
          const date = new Date(tx.date).toLocaleDateString('pt-BR');
          const amount = tx.amount > 0 ? `+R$ ${tx.amount.toFixed(2)}` : `R$ ${tx.amount.toFixed(2)}`;
          console.log(`   ${i + 1}. [${date}] ${tx.description} - ${amount}`);
        });
        
        console.log('\n✅ SISTEMA FUNCIONANDO!');
        console.log('✅ Pluggy conectado');
        console.log('✅ Transações sendo buscadas');
        console.log('✅ Pronto para salvar no Supabase');
        
      } else {
        console.log('⏳ Nenhuma transação encontrada ainda');
        console.log('💡 Aguarde mais alguns minutos para sincronização completa');
      }
    } else {
      const errorData = await txResponse.json();
      console.log('❌ Erro ao buscar transações:', JSON.stringify(errorData, null, 2));
    }
    
    // Tentar buscar contas também
    console.log('\n🏦 Tentando buscar contas...');
    const accountsResponse = await fetch(`${PLUGGY_BASE_URL}/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log(`📊 Resposta: ${accountsData.results?.length || 0} contas`);
      
      if (accountsData.results && accountsData.results.length > 0) {
        console.log('\n🏦 Contas encontradas:');
        accountsData.results.forEach((account, index) => {
          console.log(`   ${index + 1}. ${account.name} - ${account.type} - R$ ${account.balance?.toFixed(2) || 'N/A'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

testTransactions();
