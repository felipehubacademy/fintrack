import axios from 'axios';
import TransactionService from './backend/services/transactionService.js';
import { sendTransactionNotification } from './backend/services/whatsapp.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/**
 * Processar transações do ciclo de maio/2025
 */
async function processMayCycle() {
  console.log('🧪 PROCESSANDO CICLO MAIO/2025');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Autenticar
    const authResponse = await axios.post(`${PLUGGY_BASE_URL}/auth`, {
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    });
    const apiKey = authResponse.data.apiKey;
    
    // 2. Buscar transações
    const accountId = process.env.PLUGGY_LATAM_ACCOUNT_ID;
    
    const aprilResponse = await axios.get(
      `${PLUGGY_BASE_URL}/transactions`,
      {
        params: {
          accountId: accountId,
          from: '2025-04-01',
          to: '2025-04-30',
          pageSize: 500,
        },
        headers: { 'X-API-KEY': apiKey },
      }
    );
    
    const mayResponse = await axios.get(
      `${PLUGGY_BASE_URL}/transactions`,
      {
        params: {
          accountId: accountId,
          from: '2025-05-01',
          to: '2025-05-31',
          pageSize: 500,
        },
        headers: { 'X-API-KEY': apiKey },
      }
    );
    
    const aprilTransactions = aprilResponse.data.results;
    const mayTransactions = mayResponse.data.results;
    
    // Filtrar ciclo (09/abr a 08/mai)
    const aprilCycle = aprilTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getDate() >= 9;
    });
    
    const mayCycle = mayTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getDate() <= 8;
    });
    
    const allCycle = [...aprilCycle, ...mayCycle];
    
    console.log(`📊 Total de transações no ciclo: ${allCycle.length}`);
    
    // Filtrar apenas DESPESAS (remover pagamentos, estornos de crédito)
    const expenses = allCycle.filter(t => {
      const amount = parseFloat(t.amount);
      const desc = t.description.toLowerCase();
      const type = t.type;
      
      // Remover pagamentos recebidos
      if (desc.includes('pagamento recebido')) return false;
      if (desc.includes('pagamento efetuado')) return false;
      
      // Remover estornos que são CRÉDITOS (devolução de dinheiro)
      if (desc.includes('estorno') && type === 'CREDIT') return false;
      
      // Manter apenas DEBIT
      return type === 'DEBIT';
    });
    
    console.log(`💳 Despesas reais: ${expenses.length}`);
    
    // Calcular total
    const total = expenses.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    console.log(`💰 Total: R$ ${total.toFixed(2)}`);
    
    // Verificar quantas já existem no Supabase
    const transactionService = new TransactionService();
    const newExpenses = [];
    
    for (const expense of expenses) {
      const exists = await transactionService.transactionExists(expense.id);
      if (!exists) {
        newExpenses.push(expense);
      }
    }
    
    console.log(`🆕 Despesas novas: ${newExpenses.length}/${expenses.length}`);
    
    if (newExpenses.length > 0) {
      console.log('\n📱 Enviando notificações WhatsApp...');
      console.log(`⚠️ Serão enviadas ${newExpenses.length} mensagens!`);
      console.log('   (Aguardando 5 segundos entre cada envio)');
      
      for (let i = 0; i < newExpenses.length; i++) {
        const expense = newExpenses[i];
        const date = new Date(expense.date).toLocaleDateString('pt-BR');
        const amount = Math.abs(parseFloat(expense.amount));
        
        console.log(`\n[${i + 1}/${newExpenses.length}] ${date} - ${expense.description} - R$ ${amount.toFixed(2)}`);
        
        try {
          // Enviar WhatsApp
          const whatsappResponse = await sendTransactionNotification({
            ...expense,
            amount: amount
          });
          const whatsappMessageId = whatsappResponse.messages[0].id;
          
          // Salvar no Supabase
          await transactionService.saveTransaction(expense, whatsappMessageId);
          
          console.log(`✅ Enviado e salvo`);
          
          // Aguardar 5 segundos (exceto no último)
          if (i < newExpenses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          
        } catch (error) {
          console.error(`❌ Erro: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 PROCESSAMENTO CONCLUÍDO!`);
      console.log(`📱 ${newExpenses.length} notificações enviadas`);
      console.log(`💾 ${newExpenses.length} transações salvas`);
      
    } else {
      console.log('\n✅ Todas as despesas já foram processadas!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
processMayCycle();
