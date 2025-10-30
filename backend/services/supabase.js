import { createClient } from '@supabase/supabase-js';

let supabase = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
  } else {
    console.log('⚠️ Supabase credentials not found');
  }
} catch (error) {
  console.log('⚠️ Supabase initialization failed:', error.message);
}

export { supabase };

/**
 * Salvar despesa no banco (Função chamada pelo ZulAssistant)
 */
export async function saveExpense(args, userId, orgId) {
  try {
    // TODO: Implementar lógica completa de save (incluindo userId, orgId, category, payment_method, etc.)
    console.log('💾 [SUPABASE] Salvando despesa:', args);
    
    // Simulação de inserção no banco (A função original do webhook era apenas um stub)
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          date: new Date().toISOString().split('T')[0], // Usar data atual como placeholder
          description: args.description,
          amount: args.amount,
          owner: args.responsible,
          source: 'whatsapp',
          payment_method: args.payment_method,
          category: args.category || 'Outros',
          // Campos adicionais do args: card_name, installments
          // Campos do contexto: userId, orgId
        },
      ])
      .select();

    if (error) {
      console.error('❌ Erro ao salvar despesa no Supabase:', error);
      throw new Error(`Erro ao salvar despesa: ${error.message}`);
    }

    return {
      success: true,
      message: `Anotado! R$ ${args.amount} - ${args.description} ✅`
    };
  } catch (error) {
    console.error('❌ Erro ao salvar despesa (Service):', error);
    return {
      success: false,
      message: 'Ops! Tive um problema aqui. 😅'
    };
  }
}

/**
 * Check if a transaction already exists (by date, description, and amount)
 */
export async function transactionExists(date, description, amount) {
  const { data, error } = await supabase
    .from('expenses')
    .select('id')
    .eq('date', date)
    .eq('description', description)
    .eq('amount', amount)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check transaction: ${error.message}`);
  }

  return data && data.length > 0;
}

/**
 * Update expense owner
 */
export async function updateExpenseOwner(expenseId, owner, split = false) {
  const { data, error } = await supabase
    .from('expenses')
    .update({ owner, split })
    .eq('id', expenseId)
    .select();

  if (error) {
    throw new Error(`Failed to update expense: ${error.message}`);
  }

  return data[0];
}

/**
 * Get all expenses
 */
export async function getAllExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return data;
}

/**
 * Get expenses by date range
 */
export async function getExpensesByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return data;
}

