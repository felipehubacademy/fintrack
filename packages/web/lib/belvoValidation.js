// ============================================================================
// Belvo Validation Helpers
// Validates that manual inputs are not attempted on Belvo-synced accounts/cards
// ============================================================================

import { supabase } from './supabaseClient';

/**
 * Check if a bank account allows manual inputs
 * @param {string} accountId - Bank account UUID
 * @returns {Promise<{allowed: boolean, message: string}>}
 */
export async function checkBankAccountManualInputs(accountId) {
  if (!accountId) {
    return { allowed: true, message: '' };
  }

  try {
    const { data: account, error } = await supabase
      .from('bank_accounts')
      .select('manual_inputs_allowed, provider, name, bank')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      // If account not found, allow (fail open)
      return { allowed: true, message: '' };
    }

    if (!account.manual_inputs_allowed) {
      return {
        allowed: false,
        message: `A conta "${account.name} - ${account.bank}" é sincronizada automaticamente via Belvo Open Finance e não aceita lançamentos manuais.`
      };
    }

    return { allowed: true, message: '' };
  } catch (error) {
    console.error('Error checking bank account manual inputs:', error);
    // Fail open to not block users if there's an error
    return { allowed: true, message: '' };
  }
}

/**
 * Check if a card allows manual inputs
 * @param {string} cardId - Card UUID
 * @returns {Promise<{allowed: boolean, message: string}>}
 */
export async function checkCardManualInputs(cardId) {
  if (!cardId) {
    return { allowed: true, message: '' };
  }

  try {
    const { data: card, error } = await supabase
      .from('cards')
      .select('manual_inputs_allowed, provider, name, bank')
      .eq('id', cardId)
      .single();

    if (error || !card) {
      // If card not found, allow (fail open)
      return { allowed: true, message: '' };
    }

    if (!card.manual_inputs_allowed) {
      return {
        allowed: false,
        message: `O cartão "${card.name} - ${card.bank}" é sincronizado automaticamente via Belvo Open Finance e não aceita lançamentos manuais.`
      };
    }

    return { allowed: true, message: '' };
  } catch (error) {
    console.error('Error checking card manual inputs:', error);
    // Fail open to not block users if there's an error
    return { allowed: true, message: '' };
  }
}

/**
 * Validate expense data for Belvo restrictions
 * @param {object} expenseData - Expense data (payment_method, card_id, etc)
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
export async function validateExpenseForBelvo(expenseData) {
  const { payment_method, card_id } = expenseData;

  // Check if using a card
  if (payment_method === 'credit_card' && card_id) {
    const cardCheck = await checkCardManualInputs(card_id);
    if (!cardCheck.allowed) {
      return { valid: false, error: cardCheck.message };
    }
  }

  // Could add more validations here in the future

  return { valid: true, error: null };
}

/**
 * Validate bank transaction for Belvo restrictions
 * @param {object} transactionData - Transaction data (account_id, etc)
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
export async function validateBankTransactionForBelvo(transactionData) {
  const { account_id, bank_account_id } = transactionData;
  
  const accountId = account_id || bank_account_id;

  if (accountId) {
    const accountCheck = await checkBankAccountManualInputs(accountId);
    if (!accountCheck.allowed) {
      return { valid: false, error: accountCheck.message };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validate income for Belvo restrictions
 * @param {object} incomeData - Income data
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
export async function validateIncomeForBelvo(incomeData) {
  // Incomes typically don't have payment methods but might reference accounts
  // Add validation if needed in the future
  
  return { valid: true, error: null };
}

/**
 * Server-side validation using Supabase admin client
 * Use this in API routes
 */
export async function validateExpenseForBelvoServer(expenseData, supabaseClient) {
  const { payment_method, card_id } = expenseData;

  // Check if using a card
  if (payment_method === 'credit_card' && card_id) {
    const { data: card, error } = await supabaseClient
      .from('cards')
      .select('manual_inputs_allowed, provider, name, bank')
      .eq('id', card_id)
      .single();

    if (!error && card && !card.manual_inputs_allowed) {
      return {
        valid: false,
        error: `O cartão "${card.name} - ${card.bank}" é sincronizado automaticamente via Belvo Open Finance e não aceita lançamentos manuais.`
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Server-side validation for bank transactions
 */
export async function validateBankTransactionForBelvoServer(transactionData, supabaseClient) {
  const { account_id, bank_account_id } = transactionData;
  const accountId = account_id || bank_account_id;

  if (accountId) {
    const { data: account, error } = await supabaseClient
      .from('bank_accounts')
      .select('manual_inputs_allowed, provider, name, bank')
      .eq('id', accountId)
      .single();

    if (!error && account && !account.manual_inputs_allowed) {
      return {
        valid: false,
        error: `A conta "${account.name} - ${account.bank}" é sincronizada automaticamente via Belvo Open Finance e não aceita lançamentos manuais.`
      };
    }
  }

  return { valid: true, error: null };
}

