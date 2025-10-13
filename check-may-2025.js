import LatamService from './backend/services/latamService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Verificar transações de maio/2025
 */
async function checkMay2025() {
  console.log('🔍 VERIFICANDO TRANSAÇÕES DE MAIO/2025');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const latamService = new LatamService();
    
    // Buscar todas as transações
    const allTransactions = await latamService.getLatamTransactions();
    console.log(`📊 Total de transações: ${allTransactions.length}`);
    
    // Filtrar maio/2025 (ciclo: 9 de abril a 8 de maio de 2025)
    const startDate = '2025-04-09';
    const endDate = '2025-05-08';
    
    const may2025Transactions = allTransactions.filter(t => {
      const transactionDate = t.date;
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    console.log(`📅 Transações do ciclo maio/2025 (${startDate} a ${endDate}): ${may2025Transactions.length}`);
    
    if (may2025Transactions.length === 0) {
      console.log('⚠️ Nenhuma transação de maio/2025 encontrada');
      
      // Mostrar todas as transações de 2025
      const transactions2025 = allTransactions.filter(t => {
        const year = new Date(t.date).getFullYear();
        return year === 2025;
      });
      
      console.log(`\n📊 Total de transações em 2025: ${transactions2025.length}`);
      
      if (transactions2025.length > 0) {
        console.log('\n📋 TRANSAÇÕES DE 2025:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        transactions2025.forEach((t, i) => {
          const date = new Date(t.date).toLocaleDateString('pt-BR');
          console.log(`${i + 1}. ${date} - ${t.description} - R$ ${t.amount}`);
        });
        
        const total = transactions2025.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        console.log(`\n💰 TOTAL 2025: R$ ${total.toFixed(2)}`);
      }
      
      // Mostrar todas as transações disponíveis (agrupadas por mês)
      const monthGroups = {};
      allTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(t);
      });
      
      console.log('\n📊 TODAS AS TRANSAÇÕES (por mês):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      Object.entries(monthGroups).sort().forEach(([month, transactions]) => {
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        console.log(`${month}: ${transactions.length} transações - Total: R$ ${total.toFixed(2)}`);
      });
      
    } else {
      console.log('\n📋 TRANSAÇÕES DE MAIO/2025:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      may2025Transactions.forEach((t, i) => {
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        console.log(`${i + 1}. ${date} - ${t.description} - R$ ${t.amount}`);
      });
      
      const total = may2025Transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      console.log(`\n💰 TOTAL MAIO/2025: R$ ${total.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
checkMay2025();
