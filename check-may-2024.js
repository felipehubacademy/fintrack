import LatamService from './backend/services/latamService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

/**
 * Verificar transações de maio/2024
 */
async function checkMay2024() {
  console.log('🔍 VERIFICANDO TRANSAÇÕES DE MAIO/2024');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const latamService = new LatamService();
    
    // Buscar todas as transações
    const allTransactions = await latamService.getLatamTransactions();
    console.log(`📊 Total de transações: ${allTransactions.length}`);
    
    // Filtrar maio/2024 (ciclo: 9 de abril a 8 de maio de 2024)
    const startDate = '2024-04-09';
    const endDate = '2024-05-08';
    
    const may2024Transactions = allTransactions.filter(t => {
      const transactionDate = t.date;
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    console.log(`📅 Transações do ciclo maio/2024 (${startDate} a ${endDate}): ${may2024Transactions.length}`);
    
    if (may2024Transactions.length === 0) {
      console.log('⚠️ Nenhuma transação de maio/2024 encontrada');
      
      // Mostrar todas as transações agrupadas por ano/mês
      const monthGroups = {};
      allTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = [];
        }
        monthGroups[monthKey].push(t);
      });
      
      console.log('\n📊 TRANSAÇÕES DISPONÍVEIS (por mês):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      Object.entries(monthGroups).sort().forEach(([month, transactions]) => {
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        console.log(`${month}: ${transactions.length} transações - Total: R$ ${total.toFixed(2)}`);
      });
      
      console.log('\n💡 SUGESTÃO:');
      console.log('Vamos usar as transações reais de outubro/2025 para testar?');
      console.log('Ou você tem a fatura de maio/2024 para compararmos?');
      
    } else {
      console.log('\n📋 TRANSAÇÕES DE MAIO/2024:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      may2024Transactions.forEach((t, i) => {
        const date = new Date(t.date).toLocaleDateString('pt-BR');
        console.log(`${i + 1}. ${date} - ${t.description} - R$ ${t.amount}`);
      });
      
      const total = may2024Transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      console.log(`\n💰 TOTAL: R$ ${total.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
checkMay2024();
