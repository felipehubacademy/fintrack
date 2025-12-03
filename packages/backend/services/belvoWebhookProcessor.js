// ============================================================================
// Belvo Webhook Processor
// Processes webhooks from Belvo and syncs data to FinTrack database
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const { mapCategoryWithFallback } = require('../utils/belvoCategoryMapper');

class BelvoWebhookProcessor {
  constructor() {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ BelvoWebhookProcessor initialized');
  }

  /**
   * Main webhook processing entry point
   * @param {object} webhook - Webhook payload from Belvo
   * @returns {Promise<object>} Processing result
   */
  async processWebhook(webhook) {
    try {
      const { webhook_id, webhook_type, link, data } = webhook;

      console.log(`📥 Processing Belvo webhook: ${webhook_type} (ID: ${webhook_id})`);

      // 1. Check idempotency
      const alreadyProcessed = await this.checkIdempotency(webhook_id);
      if (alreadyProcessed) {
        console.log(`⏭️  Webhook ${webhook_id} already processed, skipping`);
        return { success: true, message: 'Already processed' };
      }

      // 2. Get link details from database
      const linkData = await this.getLinkData(link);
      if (!linkData) {
        console.error(`❌ Link ${link} not found in database`);
        throw new Error(`Link ${link} not found`);
      }

      // Check if link is deleted - ignore webhooks for deleted links
      if (linkData.status === 'deleted') {
        console.log(`⏭️  Link ${link} is deleted, ignoring webhook`);
        // Mark webhook as processed to prevent retries, but don't process it
        await this.markAsProcessed(webhook_id, webhook_type, link, webhook);
        return { success: true, message: 'Webhook ignored - link is deleted' };
      }

      // 3. Process based on event type
      let result;
      switch (webhook_type) {
        case 'historical_update':
          result = await this.processHistoricalUpdate(data, linkData);
          break;
        
        case 'new_transactions_available':
          result = await this.processNewTransactions(data, linkData);
          break;
        
        case 'consent_expired':
          result = await this.processConsentExpired(linkData);
          break;
        
        default:
          console.warn(`⚠️  Unknown webhook type: ${webhook_type}`);
          result = { success: true, message: 'Unknown type, ignored' };
      }

      // 4. Mark webhook as processed
      await this.markAsProcessed(webhook_id, webhook_type, link, webhook);

      // 5. Update link last_sync_at
      await this.updateLinkSyncTime(link);

      console.log(`✅ Webhook ${webhook_id} processed successfully`);
      return result;
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Check if webhook was already processed (idempotency)
   * @param {string} webhookId 
   * @returns {Promise<boolean>}
   */
  async checkIdempotency(webhookId) {
    const { data, error } = await this.supabase
      .from('belvo_webhooks_processed')
      .select('webhook_id')
      .eq('webhook_id', webhookId)
      .single();
    
    return !!data && !error;
  }

  /**
   * Mark webhook as processed
   * @param {string} webhookId 
   * @param {string} eventType 
   * @param {string} linkId 
   * @param {object} payload 
   */
  async markAsProcessed(webhookId, eventType, linkId, payload) {
    await this.supabase
      .from('belvo_webhooks_processed')
      .insert({
        webhook_id: webhookId,
        event_type: eventType,
        link_id: linkId,
        payload,
        processed_at: new Date().toISOString()
      });
  }

  /**
   * Get link data from database
   * @param {string} linkId 
   * @returns {Promise<object|null>}
   */
  async getLinkData(linkId) {
    const { data, error } = await this.supabase
      .from('belvo_links')
      .select('*')
      .eq('link_id', linkId)
      .single();
    
    if (error) {
      console.error('Error fetching link data:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Update link last_sync_at timestamp
   * @param {string} linkId 
   */
  async updateLinkSyncTime(linkId) {
    // Get current link status to avoid reactivating deleted links
    const { data: linkData } = await this.supabase
      .from('belvo_links')
      .select('status')
      .eq('link_id', linkId)
      .single();

    // Don't update status if link is deleted - preserve deletion
    if (linkData && linkData.status === 'deleted') {
      console.log(`⏭️  Link ${linkId} is deleted, skipping status update`);
      return;
    }

    await this.supabase
      .from('belvo_links')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'synced'
      })
      .eq('link_id', linkId);
  }

  /**
   * Process historical_update webhook
   * @param {object} data - Webhook data
   * @param {object} linkData - Link information
   * @returns {Promise<object>}
   */
  async processHistoricalUpdate(data, linkData) {
    const { resource_type, resources } = data;

    console.log(`📊 Processing historical_update for ${resource_type}`);

    switch (resource_type) {
      case 'ACCOUNTS':
        return await this.processAccounts(resources, linkData);
      
      case 'TRANSACTIONS':
        return await this.processTransactions(resources, linkData);
      
      case 'BILLS':
        return await this.processBills(resources, linkData);
      
      default:
        console.warn(`⚠️  Unknown resource type: ${resource_type}`);
        return { success: true, message: 'Unknown resource type' };
    }
  }

  /**
   * Process new_transactions_available webhook
   * @param {object} data 
   * @param {object} linkData 
   * @returns {Promise<object>}
   */
  async processNewTransactions(data, linkData) {
    // Same logic as historical_update for transactions
    const { resources } = data;
    return await this.processTransactions(resources, linkData);
  }

  /**
   * Process consent_expired webhook
   * @param {object} linkData 
   * @returns {Promise<object>}
   */
  async processConsentExpired(linkData) {
    console.log(`⚠️  Consent expired for link: ${linkData.link_id}`);
    
    // Update link status
    await this.supabase
      .from('belvo_links')
      .update({ status: 'expired' })
      .eq('link_id', linkData.link_id);
    
    // TODO: Send notification to user
    // await this.sendConsentExpiredNotification(linkData);
    
    return { success: true, message: 'Consent marked as expired' };
  }

  /**
   * Process accounts from Belvo
   * @param {Array} accounts 
   * @param {object} linkData 
   * @returns {Promise<object>}
   */
  async processAccounts(accounts, linkData) {
    // Don't process accounts if link is deleted
    if (linkData.status === 'deleted') {
      console.log(`⏭️  Link ${linkData.link_id} is deleted, skipping account processing`);
      return { success: true, created: 0, updated: 0, message: 'Link is deleted' };
    }

    let created = 0;
    let updated = 0;

    for (const account of accounts) {
      try {
        const accountType = account.type?.toLowerCase();
        
        // Determine if it's a card or bank account
        if (accountType === 'credit_card' || account.category === 'CREDIT_CARD') {
          // Create/update in cards table
          await this.upsertCard(account, linkData);
          created++;
        } else {
          // Create/update in bank_accounts table
          await this.upsertBankAccount(account, linkData);
          created++;
        }
      } catch (error) {
        console.error('Error processing account:', error, account);
      }
    }

    console.log(`✅ Processed ${accounts.length} accounts: ${created} created/updated`);
    
    return { success: true, created, updated };
  }

  /**
   * Create or update bank account
   * @param {object} account - Belvo account
   * @param {object} linkData - Link data
   */
  async upsertBankAccount(account, linkData) {
    const accountData = {
      name: account.name || account.institution?.name || 'Conta Belvo',
      bank: account.institution?.name || 'Banco',
      account_type: account.type === 'savings' ? 'savings' : 'checking',
      account_number: account.number || null,
      current_balance: parseFloat(account.balance?.current || account.balance?.available || 0),
      initial_balance: 0, // Will be set on first sync
      provider: 'belvo',
      belvo_link_id: linkData.link_id,
      belvo_account_id: account.id,
      manual_inputs_allowed: false,
      is_active: true,
      owner_type: 'individual', // Default, user can change later
      organization_id: linkData.organization_id,
      user_id: linkData.user_id
    };

    // Check if account already exists
    const { data: existing } = await this.supabase
      .from('bank_accounts')
      .select('id')
      .eq('belvo_account_id', account.id)
      .eq('organization_id', linkData.organization_id)
      .single();

    if (existing) {
      // Update
      await this.supabase
        .from('bank_accounts')
        .update({
          current_balance: accountData.current_balance,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      console.log(`✅ Updated bank account: ${accountData.name}`);
    } else {
      // Create
      await this.supabase
        .from('bank_accounts')
        .insert(accountData);
      
      console.log(`✅ Created bank account: ${accountData.name}`);
    }
  }

  /**
   * Create or update card
   * @param {object} account - Belvo account (credit card)
   * @param {object} linkData - Link data
   */
  async upsertCard(account, linkData) {
    const cardData = {
      name: account.name || `Cartão ${account.institution?.name}`,
      bank: account.institution?.name || 'Banco',
      card_type: 'credit',
      provider: 'belvo',
      belvo_link_id: linkData.link_id,
      belvo_account_id: account.id,
      belvo_credit_limit: parseFloat(account.credit_data?.credit_limit || 0),
      belvo_current_bill: parseFloat(account.balance?.current || 0),
      manual_inputs_allowed: false,
      is_active: true,
      is_shared: false,
      organization_id: linkData.organization_id
    };

    // Check if card already exists
    const { data: existing } = await this.supabase
      .from('cards')
      .select('id')
      .eq('belvo_account_id', account.id)
      .eq('organization_id', linkData.organization_id)
      .single();

    if (existing) {
      // Update
      await this.supabase
        .from('cards')
        .update({
          belvo_credit_limit: cardData.belvo_credit_limit,
          belvo_current_bill: cardData.belvo_current_bill,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      console.log(`✅ Updated card: ${cardData.name}`);
    } else {
      // Create
      await this.supabase
        .from('cards')
        .insert(cardData);
      
      console.log(`✅ Created card: ${cardData.name}`);
    }
  }

  /**
   * Process transactions from Belvo
   * @param {Array} transactions 
   * @param {object} linkData 
   * @returns {Promise<object>}
   */
  async processTransactions(transactions, linkData) {
    let created = 0;
    let skipped = 0;

    // Get organization's budget categories for mapping
    const { data: categories } = await this.supabase
      .from('budget_categories')
      .select('*')
      .eq('organization_id', linkData.organization_id);

    for (const transaction of transactions) {
      try {
        // Check if already processed (deduplication)
        const exists = await this.checkTransactionExists(transaction.id);
        if (exists) {
          skipped++;
          continue;
        }

        // Classify transaction type
        const type = transaction.type?.toUpperCase();
        
        if (type === 'TRANSFER') {
          // Check if it's an internal transfer (both accounts in same org)
          const isInternal = await this.isInternalTransfer(transaction, linkData.organization_id);
          
          if (isInternal) {
            await this.createTransfer(transaction, linkData);
            created++;
            continue;
          }
        }
        
        // Determine if it's income or expense
        const amount = Math.abs(parseFloat(transaction.amount || 0));
        
        if (type === 'INFLOW' || amount > 0 && transaction.amount > 0) {
          // Income
          await this.createIncome(transaction, linkData, categories);
          created++;
        } else if (type === 'OUTFLOW' || transaction.amount < 0) {
          // Expense
          await this.createExpense(transaction, linkData, categories);
          created++;
        }
      } catch (error) {
        console.error('Error processing transaction:', error, transaction);
      }
    }

    console.log(`✅ Processed ${transactions.length} transactions: ${created} created, ${skipped} skipped`);
    
    return { success: true, created, skipped };
  }

  /**
   * Check if transaction already exists
   * @param {string} belvoTransactionId 
   * @returns {Promise<boolean>}
   */
  async checkTransactionExists(belvoTransactionId) {
    // Check in expenses
    const { data: expense } = await this.supabase
      .from('expenses')
      .select('id')
      .eq('belvo_transaction_id', belvoTransactionId)
      .single();
    
    if (expense) return true;
    
    // Check in incomes
    const { data: income } = await this.supabase
      .from('incomes')
      .select('id')
      .eq('belvo_transaction_id', belvoTransactionId)
      .single();
    
    if (income) return true;
    
    // Check in transfers
    const { data: transfer } = await this.supabase
      .from('transfers')
      .select('id')
      .eq('belvo_transaction_id', belvoTransactionId)
      .single();
    
    return !!transfer;
  }

  /**
   * Check if transfer is internal (both accounts in same org and both Belvo)
   * @param {object} transaction 
   * @param {string} organizationId 
   * @returns {Promise<boolean>}
   */
  async isInternalTransfer(transaction, organizationId) {
    // Get source account
    const { data: fromAccount } = await this.supabase
      .from('bank_accounts')
      .select('id, provider')
      .eq('belvo_account_id', transaction.account)
      .eq('organization_id', organizationId)
      .single();
    
    if (!fromAccount || fromAccount.provider !== 'belvo') {
      return false;
    }
    
    // Check if destination account exists (would need counterparty info from Belvo)
    // For now, we'll assume single-account transfers are NOT internal
    // In production, you'd check transaction.counterparty data
    
    return false; // Conservative approach
  }

  /**
   * Create transfer record
   * @param {object} transaction 
   * @param {object} linkData 
   */
  async createTransfer(transaction, linkData) {
    // Get from account
    const { data: fromAccount } = await this.supabase
      .from('bank_accounts')
      .select('id')
      .eq('belvo_account_id', transaction.account)
      .eq('organization_id', linkData.organization_id)
      .single();
    
    if (!fromAccount) {
      console.warn('From account not found for transfer');
      return;
    }
    
    // Note: In real scenario, you'd identify to_account from transaction.counterparty
    // For now, we'll skip true internal transfers until we have both accounts
    
    const transferData = {
      organization_id: linkData.organization_id,
      from_account_id: fromAccount.id,
      to_account_id: fromAccount.id, // Placeholder
      amount: Math.abs(parseFloat(transaction.amount)),
      transfer_date: transaction.value_date || transaction.accounting_date,
      belvo_transaction_id: transaction.id,
      notes: transaction.description || 'Transferência Belvo'
    };
    
    await this.supabase
      .from('transfers')
      .insert(transferData);
    
    console.log(`✅ Created transfer: ${transferData.amount}`);
  }

  /**
   * Create expense from transaction
   * @param {object} transaction 
   * @param {object} linkData 
   * @param {Array} categories 
   */
  async createExpense(transaction, linkData, categories = []) {
    // Map category
    const categoryMapping = mapCategoryWithFallback(
      transaction.category,
      transaction.description,
      categories
    );
    
    // Determine payment method and related IDs
    let paymentMethod = 'bank_transfer';
    let cardId = null;
    let accountId = null;
    
    if (transaction.credit_card_data) {
      paymentMethod = 'credit_card';
      // Find card by Belvo account ID
      const { data: card } = await this.supabase
        .from('cards')
        .select('id')
        .eq('belvo_account_id', transaction.account)
        .eq('organization_id', linkData.organization_id)
        .single();
      
      cardId = card?.id || null;
    } else {
      // Find bank account
      const { data: account } = await this.supabase
        .from('bank_accounts')
        .select('id')
        .eq('belvo_account_id', transaction.account)
        .eq('organization_id', linkData.organization_id)
        .single();
      
      accountId = account?.id || null;
    }
    
    const expenseData = {
      amount: Math.abs(parseFloat(transaction.amount)),
      description: transaction.description || 'Despesa Belvo',
      date: transaction.value_date || transaction.accounting_date,
      category_id: categoryMapping.categoryId,
      payment_method: paymentMethod,
      card_id: cardId,
      status: 'confirmed',
      belvo_transaction_id: transaction.id,
      belvo_account_id: transaction.account,
      transaction_channel: transaction.channel || null,
      is_transfer: transaction.type === 'TRANSFER',
      organization_id: linkData.organization_id,
      user_id: linkData.user_id
    };
    
    await this.supabase
      .from('expenses')
      .insert(expenseData);
    
    console.log(`✅ Created expense: ${expenseData.description} - R$ ${expenseData.amount}`);
  }

  /**
   * Create income from transaction
   * @param {object} transaction 
   * @param {object} linkData 
   * @param {Array} categories 
   */
  async createIncome(transaction, linkData, categories = []) {
    const incomeData = {
      description: transaction.description || 'Entrada Belvo',
      amount: Math.abs(parseFloat(transaction.amount)),
      date: transaction.value_date || transaction.accounting_date,
      category: 'Outros', // Default category for incomes
      source: 'belvo',
      status: 'confirmed',
      belvo_transaction_id: transaction.id,
      belvo_account_id: transaction.account,
      organization_id: linkData.organization_id,
      user_id: linkData.user_id
    };
    
    await this.supabase
      .from('incomes')
      .insert(incomeData);
    
    console.log(`✅ Created income: ${incomeData.description} - R$ ${incomeData.amount}`);
  }

  /**
   * Process credit card bills
   * @param {Array} bills 
   * @param {object} linkData 
   * @returns {Promise<object>}
   */
  async processBills(bills, linkData) {
    let created = 0;
    let updated = 0;

    for (const bill of bills) {
      try {
        // Find associated card
        const { data: card } = await this.supabase
          .from('cards')
          .select('id')
          .eq('belvo_account_id', bill.account)
          .eq('organization_id', linkData.organization_id)
          .single();
        
        if (!card) {
          console.warn('Card not found for bill:', bill.id);
          continue;
        }
        
        const billData = {
          card_id: card.id,
          cycle_start_date: bill.billing_period_start,
          cycle_end_date: bill.billing_period_end,
          total_amount: parseFloat(bill.total_amount || 0),
          paid_amount: parseFloat(bill.paid_amount || 0),
          status: bill.status === 'PAID' ? 'paid' : 'pending',
          provider: 'belvo',
          belvo_bill_id: bill.id,
          organization_id: linkData.organization_id,
          user_id: linkData.user_id
        };
        
        // Check if bill exists
        const { data: existing } = await this.supabase
          .from('card_invoices')
          .select('id')
          .eq('belvo_bill_id', bill.id)
          .single();
        
        if (existing) {
          // Update
          await this.supabase
            .from('card_invoices')
            .update({
              paid_amount: billData.paid_amount,
              status: billData.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          
          updated++;
        } else {
          // Create
          await this.supabase
            .from('card_invoices')
            .insert(billData);
          
          created++;
        }
      } catch (error) {
        console.error('Error processing bill:', error, bill);
      }
    }

    console.log(`✅ Processed ${bills.length} bills: ${created} created, ${updated} updated`);
    
    return { success: true, created, updated };
  }
}

// Export singleton instance
let processorInstance = null;

function getWebhookProcessor() {
  if (!processorInstance) {
    processorInstance = new BelvoWebhookProcessor();
  }
  return processorInstance;
}

module.exports = {
  BelvoWebhookProcessor,
  getWebhookProcessor
};

