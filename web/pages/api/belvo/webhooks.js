/**
 * POST /api/belvo/webhooks
 * Receives and processes webhooks from Belvo
 */

import { createClient } from '@supabase/supabase-js';
import { 
  mapBelvoCategory, 
  getBelvoCategoryId,
  isIncomeCategory,
  isTransferCategory 
} from '../../../../backend/utils/belvoCategoryMapper.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if webhook was already processed
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
 * Get belvo_link record
 */
async function getBelvoLink(linkId) {
  const { data } = await supabase
    .from('belvo_links')
    .select('*')
    .eq('link_id', linkId)
    .single();
  
  return data;
}

/**
 * Process accounts from webhook
 */
async function processAccounts(linkId, accounts, belvoLink) {
  const { organization_id, user_id, id: belvo_link_uuid } = belvoLink;
  
  for (const account of accounts) {
    const accountId = account.id;
    const accountType = account.type;
    const accountName = account.name || account.number || 'Conta Belvo';
    const balance = parseFloat(account.balance?.current || account.balance?.available || 0);
    
    // Check if credit card
    if (accountType === 'credit_card' || account.category === 'CREDIT_CARD') {
      const { data: existing } = await supabase
        .from('cards')
        .select('id')
        .eq('belvo_account_id', accountId)
        .single();
      
      if (existing) {
        await supabase
          .from('cards')
          .update({
            name: accountName,
            bank: account.institution || 'Banco',
            current_bill_amount: Math.abs(balance),
            belvo_credit_limit: parseFloat(account.credit_data?.credit_limit || 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('cards')
          .insert({
            organization_id,
            name: accountName,
            bank: account.institution || 'Banco',
            card_type: 'credit',
            provider: 'belvo',
            belvo_link_id: belvo_link_uuid,
            belvo_account_id: accountId,
            data_source: 'belvo',
            manual_inputs_allowed: false,
            current_bill_amount: Math.abs(balance),
            belvo_credit_limit: parseFloat(account.credit_data?.credit_limit || 0),
            is_active: true,
            is_shared: false
          });
      }
    } else {
      // Bank account
      const mappedType = accountType === 'checking' ? 'checking' : 'savings';
      
      const { data: existing } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('belvo_account_id', accountId)
        .single();
      
      if (existing) {
        await supabase
          .from('bank_accounts')
          .update({
            name: accountName,
            bank: account.institution || 'Banco',
            current_balance: balance,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('bank_accounts')
          .insert({
            organization_id,
            user_id,
            name: accountName,
            bank: account.institution || 'Banco',
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
 * Process transactions from webhook
 */
async function processTransactions(linkId, transactions, belvoLink) {
  const { organization_id, user_id } = belvoLink;
  
  for (const txn of transactions) {
    const transactionId = txn.id;
    
    // Check if already exists
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('id')
      .eq('belvo_transaction_id', transactionId)
      .single();
    
    if (existingExpense) continue;
    
    const { data: existingIncome } = await supabase
      .from('incomes')
      .select('id')
      .eq('belvo_transaction_id', transactionId)
      .single();
    
    if (existingIncome) continue;
    
    const { data: existingTransfer } = await supabase
      .from('transfers')
      .select('id')
      .eq('belvo_transaction_id', transactionId)
      .single();
    
    if (existingTransfer) continue;
    
    // Parse transaction
    const amount = Math.abs(parseFloat(txn.amount || 0));
    if (amount === 0) continue;
    
    const type = txn.type; // 'INFLOW', 'OUTFLOW', 'TRANSFER'
    const category = txn.category;
    const description = txn.description || txn.merchant?.merchant_name || 'Transação Belvo';
    const date = txn.value_date || txn.accounting_date || new Date().toISOString().split('T')[0];
    const accountId = txn.account;
    
    // Get account
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
    
    // Get category
    const categoryId = await getBelvoCategoryId(supabase, category, organization_id);
    const categoryName = mapBelvoCategory(category);
    
    // Classify
    if (type === 'TRANSFER' || isTransferCategory(category)) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const webhookId = payload.webhook_id || payload.id || `webhook_${Date.now()}`;
    const eventType = payload.webhook_type || payload.event_type || 'unknown';
    const linkId = payload.link_id || payload.link;
    
    // Check idempotency
    if (await isWebhookProcessed(webhookId)) {
      return res.status(200).json({ success: true, message: 'Already processed' });
    }
    
    // Get belvo_link
    const belvoLink = await getBelvoLink(linkId);
    if (!belvoLink) {
      await markWebhookProcessed(webhookId, eventType, linkId, payload, 'failed', 'Link not found');
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Process based on event type
    if (eventType === 'historical_update' || eventType === 'HISTORICAL_UPDATE') {
      if (payload.resource_type === 'ACCOUNTS' && payload.accounts) {
        await processAccounts(linkId, payload.accounts, belvoLink);
      } else if (payload.resource_type === 'TRANSACTIONS' && payload.transactions) {
        await processTransactions(linkId, payload.transactions, belvoLink);
      }
    } else if (eventType === 'new_transactions_available' || eventType === 'NEW_TRANSACTIONS_AVAILABLE') {
      if (payload.transactions) {
        await processTransactions(linkId, payload.transactions, belvoLink);
      }
    } else if (eventType === 'consent_expired' || eventType === 'CONSENT_EXPIRED') {
      await supabase
        .from('belvo_links')
        .update({ status: 'expired' })
        .eq('link_id', linkId);
    }
    
    // Update sync time
    await supabase
      .from('belvo_links')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: eventType === 'consent_expired' ? 'expired' : 'synced'
      })
      .eq('link_id', linkId);
    
    // Mark as processed
    await markWebhookProcessed(webhookId, eventType, linkId, payload, 'success');
    
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const webhookId = req.body?.webhook_id || req.body?.id || `error_${Date.now()}`;
    const eventType = req.body?.webhook_type || 'unknown';
    const linkId = req.body?.link_id || null;
    
    await markWebhookProcessed(webhookId, eventType, linkId, req.body, 'failed', error.message);
    
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
}
