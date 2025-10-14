#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO - CREDENCIAIS DO SUPABASE
const SUPABASE_URL = 'https://ompulmhcjfzlflbrlwpu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcHVsbWhjamZ6bGZsYnJsd3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTgyODMsImV4cCI6MjA3NTU5NDI4M30.FcohoJlTkk_4Y8GQ7LkSrVynbbCCVJnF3sL30FrgJOc';

async function checkDatabaseStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA DO BANCO SUPABASE...\n');

  // Verificar se as credenciais foram configuradas
  if (SUPABASE_URL.includes('SEU_PROJETO') || SUPABASE_KEY.includes('SUA_CHAVE')) {
    console.error('❌ ERRO: Configure as credenciais do Supabase no início do arquivo!');
    console.log('📋 Substitua:');
    console.log('   - SUPABASE_URL pela URL do seu projeto');
    console.log('   - SUPABASE_KEY pela chave anônima');
    console.log('\n🔗 Para encontrar suas credenciais:');
    console.log('   1. Acesse https://supabase.com/dashboard');
    console.log('   2. Selecione seu projeto');
    console.log('   3. Vá em Settings > API');
    console.log('   4. Copie URL e anon/public key');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Teste de conexão
    console.log('📋 1. TESTE DE CONEXÃO:');
    const { data: testData, error: testError } = await supabase
      .from('expenses')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Erro de conexão:', testError.message);
      return;
    }
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // 2. Verificar tabelas existentes
    console.log('📋 2. TABELAS EXISTENTES:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Erro ao buscar tabelas:', tablesError.message);
    } else {
      console.log('✅ Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
      console.log('');
    }

    // 3. Verificar estrutura da tabela expenses
    console.log('📊 3. ESTRUTURA DA TABELA EXPENSES:');
    const { data: expensesStructure, error: expensesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'expenses')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (expensesError) {
      console.error('❌ Erro ao buscar estrutura de expenses:', expensesError.message);
    } else {
      console.log('✅ Colunas da tabela expenses:');
      expensesStructure.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      console.log('');
    }

    // 4. Verificar dados na tabela expenses
    console.log('💰 4. AMOSTRA DE DADOS:');
    const { data: expensesData, error: expensesDataError } = await supabase
      .from('expenses')
      .select('*')
      .limit(3)
      .order('date', { ascending: false });

    if (expensesDataError) {
      console.error('❌ Erro ao buscar dados de expenses:', expensesDataError.message);
    } else {
      console.log(`✅ Últimos 3 registros:`);
      expensesData.forEach((expense, index) => {
        console.log(`   ${index + 1}. ${expense.date} - ${expense.description} - R$ ${expense.amount}`);
      });
      console.log('');
    }

    // 5. Verificar se tabelas V2 existem
    console.log('🏢 5. VERIFICANDO TABELAS V2:');
    const v2Tables = ['organizations', 'users', 'cost_centers', 'budget_categories', 'budgets', 'pending_invites'];
    
    for (const tableName of v2Tables) {
      const { data: tableData, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .single();

      if (tableError && tableError.code === 'PGRST116') {
        console.log(`   ❌ ${tableName}: NÃO EXISTE`);
      } else if (tableError) {
        console.log(`   ⚠️ ${tableName}: Erro - ${tableError.message}`);
      } else {
        console.log(`   ✅ ${tableName}: EXISTE`);
      }
    }
    console.log('');

    // 6. Verificar funções existentes
    console.log('⚙️ 6. FUNÇÕES EXISTENTES:');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_type', 'FUNCTION');

    if (functionsError) {
      console.error('❌ Erro ao buscar funções:', functionsError.message);
    } else {
      console.log('✅ Funções encontradas:');
      functions.forEach(func => {
        console.log(`   - ${func.routine_name}`);
      });
      console.log('');
    }

    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('📋 Agora você pode configurar o V2 baseado na estrutura atual.');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar verificação
checkDatabaseStructure();
