#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function checkDatabaseStructure() {
  console.log('🔍 VERIFICADOR DE ESTRUTURA DO BANCO SUPABASE\n');

  // Obter credenciais
  let supabaseUrl = process.env.SUPABASE_URL;
  let supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl) {
    console.log('📋 URL do Supabase não encontrada nas variáveis de ambiente.');
    supabaseUrl = await question('🔗 Digite a URL do seu projeto Supabase (ex: https://abc123.supabase.co): ');
  }

  if (!supabaseKey) {
    console.log('📋 Chave do Supabase não encontrada nas variáveis de ambiente.');
    supabaseKey = await question('🔑 Digite a chave anônima do Supabase: ');
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais do Supabase são obrigatórias!');
    rl.close();
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('\n🔍 CONECTANDO AO SUPABASE...\n');

    // 1. Teste de conexão simples
    console.log('📋 1. TESTE DE CONEXÃO:');
    const { data: testData, error: testError } = await supabase
      .from('expenses')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Erro de conexão:', testError.message);
      rl.close();
      return;
    }
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`📊 Total de despesas: ${testData?.length || 0}\n`);

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
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'expenses')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (expensesError) {
      console.error('❌ Erro ao buscar estrutura de expenses:', expensesError.message);
    } else {
      console.log('✅ Colunas da tabela expenses:');
      expensesStructure.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      console.log('');
    }

    // 4. Verificar dados na tabela expenses
    console.log('💰 4. AMOSTRA DE DADOS NA TABELA EXPENSES:');
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
        console.log(`   ${index + 1}. ${expense.date} - ${expense.description} - R$ ${expense.amount} - ${expense.owner || 'N/A'}`);
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
        console.log(`   ⚠️ ${tableName}: Erro ao verificar - ${tableError.message}`);
      } else {
        console.log(`   ✅ ${tableName}: EXISTE`);
        
        // Contar registros se a tabela existir
        const { count: recordCount } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        console.log(`      📊 Registros: ${recordCount}`);
      }
    }
    console.log('');

    // 6. Verificar funções existentes
    console.log('⚙️ 6. FUNÇÕES EXISTENTES:');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .eq('routine_type', 'FUNCTION');

    if (functionsError) {
      console.error('❌ Erro ao buscar funções:', functionsError.message);
    } else {
      console.log('✅ Funções encontradas:');
      functions.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
      console.log('');
    }

    // 7. Verificar RLS
    console.log('🔒 7. ROW LEVEL SECURITY:');
    const { data: rlsTables, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public');

    if (rlsError) {
      console.error('❌ Erro ao verificar RLS:', rlsError.message);
    } else {
      console.log('✅ Status RLS por tabela:');
      rlsTables.forEach(table => {
        const status = table.rowsecurity ? '🔒 ATIVO' : '🔓 INATIVO';
        console.log(`   - ${table.tablename}: ${status}`);
      });
      console.log('');
    }

    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('📋 Use essas informações para configurar o V2 corretamente.');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    rl.close();
  }
}

// Executar verificação
checkDatabaseStructure();
