import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function debugFrontendIssues() {
  console.log('🔍 Debugando problemas do frontend...\n');

  try {
    // 1. Verificar se RLS está ativo
    console.log('1️⃣ Verificando RLS na tabela expenses:');
    const { data: rlsInfo, error: rlsError } = await supabase
      .rpc('get_table_rls_status', { table_name: 'expenses' })
      .catch(async () => {
        // Fallback: query direta
        const { data, error } = await supabase
          .from('pg_tables')
          .select('rowsecurity')
          .eq('tablename', 'expenses');
        return { data, error };
      });
    
    if (rlsError) {
      console.log('❌ Não foi possível verificar RLS diretamente');
    } else {
      console.log('📊 RLS Status:', rlsInfo || 'Não encontrado');
    }

    // 2. Testar acesso direto à tabela expenses
    console.log('\n2️⃣ Testando acesso direto à tabela expenses:');
    const { data: allExpenses, error: allError } = await supabase
      .from('expenses')
      .select('*')
      .limit(5);
    
    if (allError) {
      console.log('❌ Erro ao acessar expenses:', allError.message);
      if (allError.message.includes('RLS') || allError.message.includes('policy')) {
        console.log('🔒 PROBLEMA: RLS está bloqueando o acesso!');
      }
    } else {
      console.log('✅ Acesso direto OK:', allExpenses.length, 'expenses encontradas');
      allExpenses.forEach(exp => {
        console.log(`  - ID: ${exp.id}, Valor: R$ ${exp.amount}, Descrição: ${exp.description}`);
        console.log(`    Owner: ${exp.owner}, Payment: ${exp.payment_method}, Status: ${exp.status}`);
        console.log(`    Org ID: ${exp.organization_id}, Created: ${exp.created_at}`);
      });
    }

    // 3. Verificar organização específica
    console.log('\n3️⃣ Verificando organização específica:');
    const orgId = '092adfb3-41d8-4006-bfa5-7035338560e9';
    
    const { data: orgExpenses, error: orgError } = await supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', orgId)
      .limit(5);
    
    if (orgError) {
      console.log('❌ Erro ao buscar expenses da organização:', orgError.message);
    } else {
      console.log('✅ Expenses da organização:', orgExpenses.length);
      orgExpenses.forEach(exp => {
        console.log(`  - R$ ${exp.amount} - ${exp.description} (${exp.owner}) - ${exp.payment_method}`);
      });
    }

    // 4. Testar query exata do frontend (/finance)
    console.log('\n4️⃣ Testando query do frontend (/finance):');
    const { data: financeExpenses, error: financeError } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', 'confirmed')
      .eq('organization_id', orgId)
      .neq('payment_method', 'credit_card')
      .order('date', { ascending: false });
    
    if (financeError) {
      console.log('❌ Erro na query /finance:', financeError.message);
    } else {
      console.log('✅ Query /finance OK:', financeExpenses.length, 'expenses');
      financeExpenses.forEach(exp => {
        console.log(`  - R$ ${exp.amount} - ${exp.description} (${exp.owner}) - ${exp.payment_method}`);
      });
    }

    // 5. Testar query exata do frontend (/cards)
    console.log('\n5️⃣ Testando query do frontend (/cards):');
    const { data: cardExpenses, error: cardError } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', 'confirmed')
      .eq('organization_id', orgId)
      .eq('payment_method', 'credit_card')
      .order('date', { ascending: false });
    
    if (cardError) {
      console.log('❌ Erro na query /cards:', cardError.message);
    } else {
      console.log('✅ Query /cards OK:', cardExpenses.length, 'expenses');
      cardExpenses.forEach(exp => {
        console.log(`  - R$ ${exp.amount} - ${exp.description} (${exp.owner}) - ${exp.payment_method}`);
      });
    }

    // 6. Verificar se há filtro por mês
    console.log('\n6️⃣ Testando filtro por mês (2025-10):');
    const startOfMonth = '2025-10-01';
    const endOfMonth = '2025-10-31';
    
    const { data: monthExpenses, error: monthError } = await supabase
      .from('expenses')
      .select('*')
      .eq('status', 'confirmed')
      .eq('organization_id', orgId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);
    
    if (monthError) {
      console.log('❌ Erro no filtro de mês:', monthError.message);
    } else {
      console.log('✅ Filtro de mês OK:', monthExpenses.length, 'expenses');
      monthExpenses.forEach(exp => {
        console.log(`  - R$ ${exp.amount} - ${exp.description} (${exp.owner}) - ${exp.payment_method} - ${exp.date}`);
      });
    }

    // 7. Verificar estrutura da tabela
    console.log('\n7️⃣ Verificando estrutura da tabela expenses:');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'expenses')
      .order('ordinal_position');
    
    if (columnsError) {
      console.log('❌ Erro ao verificar colunas:', columnsError.message);
    } else {
      console.log('📊 Colunas da tabela expenses:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugFrontendIssues();

