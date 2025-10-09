import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

async function fetchLatamTransactions() {
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
    console.log(`🔍 Buscando dados do cartão LATAM...`);
    
    // Buscar contas
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
    
    // Encontrar o cartão LATAM
    const latamCard = accounts.find(account => 
      account.name.toLowerCase().includes('latam') || 
      account.type === 'CREDIT'
    );
    
    if (!latamCard) {
      console.log('❌ Cartão LATAM não encontrado');
      return;
    }
    
    console.log(`✅ Cartão LATAM encontrado:`);
    console.log(`   Nome: ${latamCard.name}`);
    console.log(`   Tipo: ${latamCard.type}`);
    console.log(`   Saldo: R$ ${latamCard.balance?.toFixed(2) || 'N/A'}`);
    console.log(`   ID: ${latamCard.id}`);
    
    // Buscar transações do cartão LATAM
    console.log('\n💰 Buscando transações do cartão LATAM...');
    
    const txResponse = await fetch(`${PLUGGY_BASE_URL}/transactions?itemId=${itemId}&accountId=${latamCard.id}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    
    if (txResponse.ok) {
      const txData = await txResponse.json();
      const transactions = txData.results || [];
      
      console.log(`📈 ${transactions.length} transações encontradas no cartão LATAM`);
      
      if (transactions.length > 0) {
        console.log('\n🔥 Transações do cartão LATAM:');
        transactions.forEach((tx, i) => {
          const date = new Date(tx.date).toLocaleDateString('pt-BR');
          const amount = tx.amount > 0 ? `+R$ ${tx.amount.toFixed(2)}` : `R$ ${tx.amount.toFixed(2)}`;
          console.log(`   ${i + 1}. [${date}] ${tx.description} - ${amount}`);
        });
        
        // Calcular totais
        const totalSpent = transactions
          .filter(tx => tx.amount < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        
        const totalCredits = transactions
          .filter(tx => tx.amount > 0)
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        console.log('\n📊 RESUMO DO CARTÃO LATAM:');
        console.log(`   💳 Nome: ${latamCard.name}`);
        console.log(`   💰 Saldo atual: R$ ${latamCard.balance?.toFixed(2) || 'N/A'}`);
        console.log(`   📈 Total de transações: ${transactions.length}`);
        console.log(`   💸 Total gasto: R$ ${totalSpent.toFixed(2)}`);
        console.log(`   💵 Total creditado: R$ ${totalCredits.toFixed(2)}`);
        console.log(`   🆔 Account ID: ${latamCard.id}`);
        
        console.log('\n🎉 DADOS DO CARTÃO LATAM PRONTOS!');
        console.log('✅ Transações sendo buscadas');
        console.log('✅ Pronto para salvar no Supabase');
        console.log('✅ Pronto para notificações WhatsApp');
        
        // Salvar Account ID no .env para usar no sistema
        console.log('\n🔧 Adicione ao seu .env:');
        console.log(`PLUGGY_LATAM_ACCOUNT_ID=${latamCard.id}`);
        
      } else {
        console.log('⏳ Nenhuma transação encontrada no cartão LATAM');
      }
    } else {
      const errorData = await txResponse.json();
      console.log(`❌ Erro ao buscar transações: ${errorData.message || 'Erro desconhecido'}`);
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

fetchLatamTransactions();
