import dotenv from 'dotenv';
import LatamService from './backend/services/latamService.js';

dotenv.config({ path: './backend/.env' });

async function testLatamService() {
  console.log('🧪 Testando serviço LATAM...');
  
  const latamService = new LatamService();
  
  // Testar resumo completo
  console.log('\n📊 Gerando resumo do cartão LATAM...');
  const summary = await latamService.getLatamSummary();
  
  if (summary) {
    console.log('\n💳 RESUMO DO CARTÃO LATAM:');
    console.log(`   Nome: ${summary.account.name}`);
    console.log(`   Tipo: ${summary.account.type}`);
    console.log(`   Saldo: R$ ${summary.account.balance?.toFixed(2) || 'N/A'}`);
    
    console.log('\n📈 ESTATÍSTICAS:');
    console.log(`   Total de transações: ${summary.summary.totalTransactions}`);
    console.log(`   Total gasto: R$ ${summary.summary.totalSpent.toFixed(2)}`);
    console.log(`   Total creditado: R$ ${summary.summary.totalCredits.toFixed(2)}`);
    console.log(`   Saldo líquido: R$ ${summary.summary.netAmount.toFixed(2)}`);
    
    console.log('\n🏷️ GASTOS POR CATEGORIA:');
    Object.entries(summary.categoryBreakdown).forEach(([category, amount]) => {
      console.log(`   ${category}: R$ ${amount.toFixed(2)}`);
    });
    
    console.log('\n🔥 ÚLTIMAS TRANSAÇÕES:');
    summary.transactions.forEach((tx, i) => {
      const date = new Date(tx.date).toLocaleDateString('pt-BR');
      const amount = tx.amount > 0 ? `+R$ ${tx.amount.toFixed(2)}` : `R$ ${tx.amount.toFixed(2)}`;
      console.log(`   ${i + 1}. [${date}] ${tx.description} - ${amount} (${tx.category})`);
    });
    
    console.log('\n🎉 SERVIÇO LATAM FUNCIONANDO!');
    console.log('✅ Dados extraídos com sucesso');
    console.log('✅ Categorização automática');
    console.log('✅ Pronto para integração');
    
  } else {
    console.log('❌ Erro ao gerar resumo');
  }
}

testLatamService().catch(console.error);
