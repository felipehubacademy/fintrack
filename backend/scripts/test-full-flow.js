import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const API_URL = 'https://fintrack-backend-theta.vercel.app/api/test-webhook';
const PHONE = '+5511978229898';

async function sendMessage(message) {
  console.log(`\n📤 Enviando: "${message}"`);
  const response = await axios.post(API_URL, { message });
  const logs = response.data.logs || [];
  
  // Mostrar TODOS os logs para debug
  console.log('\n📋 TODOS OS LOGS:');
  logs.forEach((log, index) => {
    console.log(`   [${index}] ${log.message.substring(0, 200)}`);
  });
  
  // Procurar logs de save_expense
  const saveLogs = logs.filter(log => log.message.includes('[SAVE_EXPENSE]') || log.message.includes('[FUNCTION_CALL]'));
  if (saveLogs.length > 0) {
    console.log('\n🔍 LOGS SAVE_EXPENSE:');
    saveLogs.forEach(log => console.log('  ', log.message));
  }
  
  const resposta = logs.find(log => log.message.includes('Resposta recebida do Assistant:'));
  
  if (resposta) {
    const texto = resposta.message.split('Assistant: ')[1];
    console.log(`\n🤖 ZUL: ${texto}`);
    return texto;
  }
  
  console.log('\n❌ Sem resposta do Assistant');
  return null;
}

async function clearThread() {
  console.log('\n🗑️ Limpando thread...');
  await supabase
    .from('conversation_state')
    .update({ state: 'idle', temp_data: {} })
    .eq('user_phone', PHONE);
  console.log('✅ Thread limpa');
}

async function checkExpenseInDB() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('description', 'mercado')
    .eq('amount', '100.00')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (data && data.length > 0) {
    console.log('\n✅ DESPESA SALVA NO BANCO:');
    console.log(JSON.stringify(data[0], null, 2));
    return data[0];
  } else {
    console.log('\n❌ Despesa não encontrada no banco');
    return null;
  }
}

async function testFullFlow() {
  try {
    console.log('🚀 TESTE COMPLETO DO FLUXO ZUL ASSISTANT\n');
    
    // Limpar thread antiga
    await clearThread();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Passo 1: Mencionar despesa
    console.log('\n=== PASSO 1: Mencionar despesa ===');
    await sendMessage('Gastei 100 no mercado');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Passo 2: Responder forma de pagamento
    console.log('\n=== PASSO 2: Forma de pagamento ===');
    await sendMessage('PIX');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Passo 3: Responder responsável
    console.log('\n=== PASSO 3: Responsável ===');
    const resposta3 = await sendMessage('Eu');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar se salvou no banco
    console.log('\n=== VERIFICANDO BANCO DE DADOS ===');
    const expense = await checkExpenseInDB();
    
    if (expense) {
      console.log('\n✅ TESTE COMPLETO: SUCESSO!');
      console.log('   - Despesa registrada');
      console.log('   - Valor:', `R$ ${expense.amount}`);
      console.log('   - Descrição:', expense.description);
      console.log('   - Pagamento:', expense.payment_method);
      console.log('   - Responsável:', expense.owner);
    } else {
      console.log('\n❌ TESTE FALHOU: Despesa não foi salva');
    }
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('   Resposta:', error.response.data);
    }
  }
}

testFullFlow();

