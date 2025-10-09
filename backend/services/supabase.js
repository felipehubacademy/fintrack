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
 * Save a new expense to Supabase
 */
export async function saveExpense(expense) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([
      {
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        source: expense.source || 'pluggy',
        owner: expense.owner || null,
        split: expense.split || false,
      },
    ])
    .select();

  if (error) {
    throw new Error(`Failed to save expense: ${error.message}`);
  }

  return data[0];
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

