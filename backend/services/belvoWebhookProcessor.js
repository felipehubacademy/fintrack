/**
 * Belvo Webhook Processor
 * Handles webhook events from Belvo and syncs data to FinTrack
 */

import { createClient } from '@supabase/supabase-js';
import { 
  mapBelvoCategory, 
  getBelvoCategoryId,
  isIncomeCategory,
  isTransferCategory 
} from '../utils/belvoCategoryMapper.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if webhook was already processed (idempotency)
 * @param {string} webhookId - Belvo webhook ID
 * @returns {Promise<boolean>}
 */
async function isWebhookProcessed(webhookId) {
  const { data } = await supabase
    .from('belvo_webhooks_processed')
    .select('webhook_id')
    .eq('webhook_id', webhookId)
    .single();
  
  return !!data;
}

/**
 * Mark webhook as processed
 * @param {string} webhookId - Belvo webhook ID
 * @param {string} eventType - Event type
 * @param {string} linkId - Belvo link ID
 * @param {object} payload - Full webhook payload
 * @param {string} status - Processing status
 * @param {string} errorMessage - Error message if failed
 */
async function markWebhookProcessed(webhookId, eventType, linkId, payload, status = 'success', errorMessage = null) {
  await supabase
    .from('belvo_webhooks_processed')
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      link_id: linkId,
      payload,
      processing_status: status,
      error_message: errorMessage
    });
}

/**
 * Get or create belvo_link record
 * @param {string} linkId - Belvo link ID
 * @param {string} institutionName - Bank name
 * @returns {Promise<object>} belvo_link record
 */
async function getOrCreateBelvoLink(linkId, institutionName) {
  // Try to find existing link
  const { data: existingLink } = await supabase
    .from('belvo_links')
    .select('*')
    .eq('link_id', linkId)
    .single();
  
  if (existingLink) {
    return existingLink;
  }
  
  // If not found, we need organization and user info
  // This should have been created when user initiated the connection
  // For now, return null and handle in the caller
  return null;
}

/**
 * Process ACCOUNTS webhook event
 * Creates/updates bank_accounts and cards
 */
async function processAccountsEvent(linkId, accounts, belvoLinkRecord) {
  if (!belvoLinkRecord) {
    throw new Error('Belvo link record not found');
  }
  
  const { organization_id, user_id, id: belvo_link_uuid } = belvoLinkRecord;
  
  for (const account of accounts) {
    const accountId = account.id;
    const accountType = account.type; // 'checking', 'savings', 'credit_card', etc.
    const accountName = account.name || account.number;
    const balance = parseFloat(account.balance?.current || account.balance?.available || 0);
    
    // Check if this is a credit card
    if (accountType === 'credit_card' || account.category === 'CREDIT_CARD') {
      // Create/update card
      const { data: existingCard } = await supabase
        .from('cards')
        .select('id')
        .eq('belvo_account_id', accountId)
        .single();
      
      if (existingCard) {
        // Update existing card
        await supabase
          .from('cards')
          .update({
            name: accountName,
            bank: account.institution,
            current_bill_amount: Math.abs(balance),
            belvo_credit_limit: parseFloat(account.credit_data?.credit_limit || 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCard.id);
      } else {
        // Create new card
        await supabase
          .from('cards')
          .insert({
            organization_id,
            name: accountName,
            bank: account.institution,
            card_type: 'credit',
            provider: 'belvo',
            belvo_link_id: belvo_link_uuid,
            belvo_account_id: accountId,
            data_source: 'belvo',
            manual_inputs_allowed: false,
            current_bill_amount: Math.abs(balance),
            belvo_credit_limit: parseFloat(account.credit_data?.credit_limit || 0),
            is_active: true
          });
      }
    } else {
      // Create/update bank account
      const mappedType = accountType === 'checking' ? 'checking' : 'savings';
      
      const { data: existingAccount } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('belvo_account_id', accountId)
        .single();
      
      if (existingAccount) {
        // Update existing account
        await supabase
          .from('bank_accounts')
          .update({
            name: accountName,
            bank: account.institution,
            current_balance: balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAccount.id);
      } else {
        // Create new account
        await supabase
          .from('bank_accounts')
          .insert({
            organization_id,
            user_id,
            name: accountName,
            bank: account.institution,
            account_type: mappedType,
            account_number: account.number,
            initial_balance: balance,
            current_balance: balance,
            provider: 'belvo',
            belvo_link_id: belvo_link_uuid,
            belvo_account_id: accountId,
            data_source: 'belvo',
            manual_inputs_allowed: false,
            is_active: true,
            owner_type: 'individual'
          });
      }
    }
  }
}

/**
 * Process TRANSACTIONS webhook event
 * Creates expenses, incomes, or transfers
 */
async function processTransactionsEvent(linkId, transactions, belvoLinkRecord) {
  if (!belvoLinkRecord) {
    throw new Error('Belvo link record not found');
  }
  
  const { organization_id, user_id } = belvoLinkRecord;
  
  for (const txn of transactions) {
    const transactionId = txn.id;
    
    // Check if already processed
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id')
      .eq('belvo_transaction_id', transactionId)
      .single();
    
    if (existingExpense) {
      continue; // Skip if already exists
    }
    
    // Also check incomes and transfers
    const { data: existingIncome } = await supabase
      .from('incomes')
      .select('id')
      .eq('belvo_transaction_id', transactionId)
      .single();
    
    if (existingIncome) {
      continue;
    }
    
    const { data: existingTransfer } = await supabase
      .from('transfers')
      .select('id')
      .eq('belvo_transaction_id', transactionId)
      .single();
    
    if (existingTransfer) {
      continue;
    }
    
    // Process transaction
    const amount = Math.abs(parseFloat(txn.amount));
    const type = txn.type; // 'INFLOW', 'OUTFLOW', 'TRANSFER'
    const category = txn.category;
    const description = txn.description || 'Transação Belvo';
    const date = txn.value_date || txn.accounting_date;
    const accountId = txn.account;
    
    // Get the bank account or card
    const { data: bankAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('belvo_account_id', accountId)
      .single();
    
    const { data: card } = await supabase
      .from('cards')
      .select('id')
      .eq('belvo_account_id', accountId)
      .single();
    
    // Get category ID
    const categoryId = await getBelvoCategoryId(supabase, category, organization_id);
    const categoryName = mapBelvoCategory(category);
    
    // Classify transaction
    if (type === 'TRANSFER' || isTransferCategory(category)) {
      // Create transfer
      await supabase
        .from('transfers')
        .insert({
          organization_id,
          user_id,
          from_account_id: type === 'OUTFLOW' ? bankAccount?.id : null,
          to_account_id: type === 'INFLOW' ? bankAccount?.id : null,
          amount,
          date,
          belvo_transaction_id: transactionId,
          notes: description
        });
    } else if (type === 'INFLOW' || isIncomeCategory(category)) {
      // Create income
      await supabase
        .from('incomes')
        .insert({
          organization_id,
          user_id,
          description,
          amount,
          date,
          category: categoryName,
          category_id: categoryId,
          bank_account_id: bankAccount?.id,
          belvo_transaction_id: transactionId,
          belvo_account_id: accountId,
          source: 'import',
          status: 'confirmed'
        });
    } else if (type === 'OUTFLOW') {
      // Create expense
      let paymentMethod = 'other';
      let cardId = null;
      let bankAccountId = null;
      
      if (card) {
        paymentMethod = 'credit_card';
        cardId = card.id;
      } else if (bankAccount) {
        paymentMethod = 'debit_card';
        bankAccountId = bankAccount.id;
      }
      
      await supabase
        .from('expenses')
        .insert({
          organization_id,
          user_id,
          description,
          amount,
          date,
          category: categoryName,
          category_id: categoryId,
          payment_method: paymentMethod,
          card_id: cardId,
          bank_account_id: bankAccountId,
          belvo_transaction_id: transactionId,
          belvo_account_id: accountId,
          transaction_channel: txn.merchant?.merchant_name || null,
          is_belvo_payload: true,
          is_transfer: false,
          status: 'confirmed'
        });
    }
  }
}

/**
 * Main webhook processor
 * @param {object} webhookPayload - Full webhook payload from Belvo
 * @returns {Promise<object>} Processing result
 */
export async function processWebhook(webhookPayload) {
  const webhookId = webhookPayload.webhook_id || webhookPayload.id;
  const eventType = webhookPayload.webhook_type || webhookPayload.event_type;
  const linkId = webhookPayload.link_id || webhookPayload.link;
  
  // Check idempotency
  if (await isWebhookProcessed(webhookId)) {
    return { success: true, message: 'Webhook already processed' };
  }
  
  try {
    // Get belvo_link record
    const belvoLinkRecord = await getOrCreateBelvoLink(linkId, webhookPayload.institution);
    
    if (!belvoLinkRecord) {
      throw new Error('Belvo link not found in database');
    }
    
    // Process based on event type
    switch (eventType) {
      case 'historical_update':
        // Check resource type
        if (webhookPayload.resource_type === 'ACCOUNTS' && webhookPayload.accounts) {
          await processAccountsEvent(linkId, webhookPayload.accounts, belvoLinkRecord);
        } else if (webhookPayload.resource_type === 'TRANSACTIONS' && webhookPayload.transactions) {
          await processTransactionsEvent(linkId, webhookPayload.transactions, belvoLinkRecord);
        }
        break;
      
      case 'new_transactions_available':
        if (webhookPayload.transactions) {
          await processTransactionsEvent(linkId, webhookPayload.transactions, belvoLinkRecord);
        }
        break;
      
      case 'consent_expired':
        // Update link status
        await supabase
          .from('belvo_links')
          .update({ status: 'expired' })
          .eq('link_id', linkId);
        break;
      
      default:
        console.warn('Unknown webhook event type:', eventType);
    }
    
    // Update last_sync_at
    await supabase
      .from('belvo_links')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'synced'
      })
      .eq('link_id', linkId);
    
    // Mark as processed
    await markWebhookProcessed(webhookId, eventType, linkId, webhookPayload, 'success');
    
    return { success: true, message: 'Webhook processed successfully' };
  } catch (error) {
    console.error('Error processing webhook:', error);
    await markWebhookProcessed(webhookId, eventType, linkId, webhookPayload, 'failed', error.message);
    throw error;
  }
}

export default { processWebhook };
