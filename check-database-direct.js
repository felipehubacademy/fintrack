#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// 🔧 CONFIGURAÇÃO - CREDENCIAIS DO SUPABASE
const SUPABASE_URL = 'https://ompulmhcjfzlflbrlwpu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tcHVsbWhjamZ6bGZsYnJsd3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTgyODMsImV4cCI6MjA3NTU5NDI4M30.FcohoJlTkk_4Y8GQ7LkSrVynbbCCVJnF3sL30FrgJOc';

async function checkDatabaseStructure() {
  console.log('🔍 VERIFICANDO ESTRUTURA DO BANCO SUPABASE...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // 1. Teste de conexão com expenses
    console.log('📋 1. TESTE DE CONEXÃO:');
    const { data: expensesData, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);

    if (expensesError) {
      console.error('❌ Erro ao conectar com expenses:', expensesError.message);
      return;
    }
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`📊 Tabela 'expenses' existe e é acessível\n`);

    // 2. Verificar estrutura da tabela expenses (amostra)
    console.log('📊 2. ESTRUTURA DA TABELA EXPENSES (baseada em dados):');
    if (expensesData && expensesData.length > 0) {
      const sampleExpense = expensesData[0];
      console.log('✅ Colunas encontradas na tabela expenses:');
      Object.keys(sampleExpense).forEach(key => {
        const value = sampleExpense[key];
        const type = typeof value;
        console.log(`   - ${key}: ${type} (exemplo: ${value})`);
      });
    } else {
      console.log('⚠️ Tabela expenses está vazia');
    }
    console.log('');

    // 3. Verificar dados na tabela expenses
    console.log('💰 3. DADOS NA TABELA EXPENSES:');
    const { data: allExpenses, error: allExpensesError, count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .limit(5)
      .order('date', { ascending: false });

    if (allExpensesError) {
      console.error('❌ Erro ao buscar dados de expenses:', allExpensesError.message);
    } else {
      console.log(`✅ Total de registros: ${count || 0}`);
      if (allExpenses && allExpenses.length > 0) {
        console.log('✅ Últimos registros:');
        allExpenses.forEach((expense, index) => {
          console.log(`   ${index + 1}. ${expense.date} - ${expense.description} - R$ ${expense.amount} - ${expense.owner || 'N/A'}`);
        });
      } else {
        console.log('⚠️ Nenhum registro encontrado');
      }
    }
    console.log('');

    // 4. Verificar se tabelas V2 existem (tentativa de acesso direto)
    console.log('🏢 4. VERIFICANDO TABELAS V2:');
    const v2Tables = ['organizations', 'users', 'cost_centers', 'budget_categories', 'budgets', 'pending_invites'];
    
    for (const tableName of v2Tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (tableError) {
          if (tableError.code === 'PGRST116' || tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
            console.log(`   ❌ ${tableName}: NÃO EXISTE`);
          } else {
            console.log(`   ⚠️ ${tableName}: Erro - ${tableError.message}`);
          }
        } else {
          console.log(`   ✅ ${tableName}: EXISTE`);
          console.log(`      📊 Acessível e pode conter dados`);
        }
      } catch (error) {
        console.log(`   ❌ ${tableName}: NÃO EXISTE ou não acessível`);
      }
    }
    console.log('');

    // 5. Verificar outras tabelas possíveis
    console.log('🔍 5. VERIFICANDO OUTRAS TABELAS POSSÍVEIS:');
    const otherTables = ['allowed_users', 'budget_categories', 'categories'];
    
    for (const tableName of otherTables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (tableError) {
          console.log(`   ❌ ${tableName}: NÃO EXISTE`);
        } else {
          console.log(`   ✅ ${tableName}: EXISTE`);
        }
      } catch (error) {
        console.log(`   ❌ ${tableName}: NÃO EXISTE`);
      }
    }
    console.log('');

    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('📋 Baseado na estrutura atual, podemos configurar o V2 adequadamente.');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar verificação
checkDatabaseStructure();
