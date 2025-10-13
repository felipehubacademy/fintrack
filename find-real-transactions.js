import LatamService from './backend/services/latamService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Buscar transações reais (não parcelas futuras)
 */
async function findRealTransactions() {
  console.log('🔍 BUSCANDO TRANSAÇÕES REAIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const latamService = new LatamService();
    
    // Buscar todas as transações
    console.log('📊 Buscando todas as transações...');
    const allTransactions = await latamService.getLatamTransactions();
    console.log(`✅ Total: ${allTransactions.length} transações`);
    
    // Filtrar transações até hoje (não futuras)
    const today = new Date();
    const realTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate <= today;
    });
    
    console.log(`📅 Transações reais (até hoje): ${realTransactions.length}`);
    
    if (realTransactions.length === 0) {
      console.log('⚠️ Nenhuma transação real encontrada');
      console.log('💡 Todas as transações são parcelas futuras');
      
      // Mostrar estatísticas por ano
      const yearStats = {};
      allTransactions.forEach(t => {
        const year = new Date(t.date).getFullYear();
        yearStats[year] = (yearStats[year] || 0) + 1;
      });
      
      console.log('\n📊 Estatísticas por ano:');
      Object.entries(yearStats).forEach(([year, count]) => {
        console.log(`${year}: ${count} transações`);
      });
      
    } else {
      console.log('\n📋 TRANSAÇÕES REAIS ENCONTRADAS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      realTransactions.forEach((t, i) => {
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        console.log(`${i + 1}. ${date} - ${t.description} - R$ ${t.amount}`);
      });
      
      // Agrupar por mês
      const monthGroups = {};
      realTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(t);
      });
      
      console.log('\n📊 AGRUPAMENTO POR MÊS:');
      Object.entries(monthGroups).forEach(([month, transactions]) => {
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        console.log(`${month}: ${transactions.length} transações - Total: R$ ${total.toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
findRealTransactions();
