#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas');
  console.log('📋 Certifique-se de que o arquivo .env contém:');
  console.log('SUPABASE_URL=https://seu-projeto.supabase.co');
  console.log('SUPABASE_KEY=sua-chave-anonima');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA DO BANCO SUPABASE...\n');

  try {
    // 1. Verificar tabelas existentes
    console.log('📋 1. TABELAS EXISTENTES:');
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

    // 2. Verificar estrutura da tabela expenses
    console.log('📊 2. ESTRUTURA DA TABELA EXPENSES:');
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

    // 3. Verificar dados na tabela expenses
    console.log('💰 3. DADOS NA TABELA EXPENSES:');
    const { data: expensesData, error: expensesDataError, count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .limit(5);

    if (expensesDataError) {
      console.error('❌ Erro ao buscar dados de expenses:', expensesDataError.message);
    } else {
      console.log(`✅ Total de registros: ${count}`);
      console.log('✅ Últimos 5 registros:');
      expensesData.forEach((expense, index) => {
        console.log(`   ${index + 1}. ${expense.date} - ${expense.description} - R$ ${expense.amount} - ${expense.owner || 'N/A'}`);
      });
      console.log('');
    }

    // 4. Verificar se tabelas V2 existem
    console.log('🏢 4. VERIFICANDO TABELAS V2:');
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

    // 5. Verificar funções existentes
    console.log('⚙️ 5. FUNÇÕES EXISTENTES:');
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

    // 6. Verificar triggers
    console.log('🔧 6. TRIGGERS EXISTENTES:');
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_object_table')
      .eq('trigger_schema', 'public');

    if (triggersError) {
      console.error('❌ Erro ao buscar triggers:', triggersError.message);
    } else {
      console.log('✅ Triggers encontrados:');
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (tabela: ${trigger.event_object_table})`);
      });
      console.log('');
    }

    // 7. Verificar RLS (Row Level Security)
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
  }
}

// Executar verificação
checkDatabaseStructure();
