import axios from 'axios';
import TransactionService from './backend/services/transactionService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/**
 * Importar transações do ciclo de maio/2025 direto para o Supabase
 * SEM enviar WhatsApp
 */
async function importMayToSupabase() {
  console.log('📥 IMPORTANDO CICLO MAIO/2025 PARA SUPABASE');
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
    
    console.log('📊 Buscando transações de abril/2025...');
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
    
    console.log('📊 Buscando transações de maio/2025...');
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
    
    console.log(`✅ Total de transações no ciclo: ${allCycle.length}`);
    
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
    
    console.log(`💳 Despesas: ${expenses.length}`);
    
    // Calcular total
    const total = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    console.log(`💰 Total: R$ ${total.toFixed(2)}`);
    
    // Verificar quantas já existem no Supabase
    const transactionService = new TransactionService();
    const newExpenses = [];
    
    console.log('\n🔍 Verificando transações já existentes...');
    for (const expense of expenses) {
      const exists = await transactionService.transactionExists(expense.id);
      if (!exists) {
        newExpenses.push(expense);
      }
    }
    
    console.log(`🆕 Despesas novas: ${newExpenses.length}/${expenses.length}`);
    
    if (newExpenses.length > 0) {
      console.log('\n💾 Salvando no Supabase (SEM WhatsApp)...\n');
      
      let saved = 0;
      for (let i = 0; i < newExpenses.length; i++) {
        const expense = newExpenses[i];
        const date = new Date(expense.date).toLocaleDateString('pt-BR');
        const amount = parseFloat(expense.amount);
        
        try {
          // Salvar no Supabase SEM whatsapp_message_id
          await transactionService.saveTransaction({
            id: expense.id,
            date: expense.date,
            description: expense.description,
            amount: amount,
            category: expense.category || 'Outros',
            source: 'pluggy'
          }, null); // null = sem WhatsApp
          
          saved++;
          
          // Mostrar progresso a cada 10
          if (saved % 10 === 0 || saved === newExpenses.length) {
            console.log(`✅ ${saved}/${newExpenses.length} salvas`);
          }
          
        } catch (error) {
          console.error(`❌ Erro ao salvar ${expense.description}:`, error.message);
        }
      }
      
      console.log(`\n🎉 IMPORTAÇÃO CONCLUÍDA!`);
      console.log(`💾 ${saved} despesas salvas no Supabase`);
      console.log(`💰 Total: R$ ${total.toFixed(2)}`);
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. Acesse o dashboard');
      console.log('2. Veja as transações pendentes');
      console.log('3. Classifique manualmente (editar no Supabase)');
      
    } else {
      console.log('\n✅ Todas as despesas já foram importadas!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
importMayToSupabase();
