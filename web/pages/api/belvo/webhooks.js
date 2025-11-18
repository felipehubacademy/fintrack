import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhook_id, webhook_type, link_id, data } = req.body;

    console.log('📥 Belvo webhook received:', webhook_type, 'for link:', link_id);

    // Validate webhook_id (idempotency)
    if (!webhook_id) {
      console.error('Missing webhook_id');
      return res.status(400).json({ error: 'Missing webhook_id' });
    }

    // Check if already processed
    const { data: existing } = await supabase
      .from('belvo_webhooks_processed')
      .select('webhook_id')
      .eq('webhook_id', webhook_id)
      .single();

    if (existing) {
      console.log('⏭️  Webhook already processed, skipping');
      return res.status(200).json({ 
        success: true,
        message: 'Webhook already processed' 
      });
    }

    // Get link details
    const { data: belvoLink } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('link_id', link_id)
      .single();

    if (!belvoLink) {
      console.error('Link not found:', link_id);
      return res.status(404).json({ error: 'Link not found' });
    }

    // Process webhook based on type
    let result;
    switch (webhook_type) {
      case 'HISTORICAL_UPDATE':
        result = await processHistoricalUpdate(belvoLink, data);
        break;
      case 'NEW_TRANSACTIONS_AVAILABLE':
      case 'TRANSACTIONS': // Belvo também envia este tipo
        result = await processNewTransactions(belvoLink, data);
        break;
      case 'ACCOUNTS': // Belvo também envia este tipo separado
        result = await processHistoricalUpdate(belvoLink, data);
        break;
      case 'CONSENT_EXPIRED':
        result = await processConsentExpired(belvoLink);
        break;
      default:
        console.log('Unknown webhook type:', webhook_type);
        // Para tipos desconhecidos, tentar processar como histórico
        if (webhook_type.includes('TRANSACTION') || webhook_type.includes('ACCOUNT')) {
          result = await processHistoricalUpdate(belvoLink, data);
        } else {
          result = { success: true, message: 'Webhook type not handled' };
        }
    }

    // Mark webhook as processed
    await supabase
      .from('belvo_webhooks_processed')
      .insert({
        webhook_id,
        event_type: webhook_type,
        link_id,
        payload: req.body
      });

    // Update link sync time
    await supabase
      .from('belvo_links')
      .update({ 
        last_sync_at: new Date().toISOString(),
        status: 'synced'
      })
      .eq('link_id', link_id);

    console.log('✅ Webhook processed successfully');

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Process historical update webhook
async function processHistoricalUpdate(belvoLink, data) {
  console.log('📊 Processing historical update for link:', belvoLink.link_id);
  
  const results = {
    accounts: 0,
    transactions: 0,
    bills: 0
  };

  // Get Belvo credentials
  const secretId = process.env.BELVO_SECRET_ID;
  const secretPassword = process.env.BELVO_SECRET_PASSWORD;
  const apiUrl = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';
  const auth = Buffer.from(`${secretId}:${secretPassword}`).toString('base64');

  // 1. Fetch and save accounts
  try {
    console.log('🔍 Fetching accounts from Belvo API...');
    const accountsResponse = await fetch(
      `${apiUrl}/api/accounts/?link=${belvoLink.link_id}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('📥 Accounts response status:', accountsResponse.status);

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log('📦 Accounts data received:', accountsData);
      const accountsArray = Array.isArray(accountsData) ? accountsData : (accountsData.results || []);
      console.log(`💾 Saving ${accountsArray.length} accounts...`);
      results.accounts = await saveAccounts(belvoLink, accountsArray);
      console.log(`✅ Saved ${results.accounts} accounts`);
    } else {
      const errorText = await accountsResponse.text();
      console.error('❌ Error fetching accounts:', accountsResponse.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
  }

  // 2. Fetch and save transactions
  try {
    const transactionsResponse = await fetch(
      `${apiUrl}/api/transactions/?link=${belvoLink.link_id}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json();
      results.transactions = await saveTransactions(belvoLink, transactionsData.results || transactionsData);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }

  return results;
}

// Save accounts to database
async function saveAccounts(belvoLink, accounts) {
  let savedCount = 0;

  if (!accounts || accounts.length === 0) {
    console.log('⚠️ No accounts to save');
    return 0;
  }

  console.log(`💾 Processing ${accounts.length} accounts...`);

  for (const account of accounts) {
    try {
      console.log('💾 Saving account:', account.id, account.type, account.name);
      
      // Determine if it's a bank account or credit card
      const isCard = account.type === 'credit_card' || account.category === 'CREDIT_CARD';

      if (isCard) {
        // Save as credit card
        const cardData = {
          organization_id: belvoLink.organization_id,
          user_id: belvoLink.user_id,
          name: account.name || `${account.institution?.name} - ${account.number?.slice(-4)}`,
          bank: account.institution?.name || 'Unknown',
          holder_name: belvoLink.user_id, // We'll use user_id as placeholder
          last_four_digits: account.number?.replace(/\D/g, '').slice(-4) || '0000',
          credit_limit: account.credit_data?.limit || account.credit_limit || 0,
          closing_day: account.closing_day || 1,
          due_day: account.payment_day || 10,
          provider: 'belvo',
          belvo_link_id: belvoLink.link_id,
          belvo_account_id: account.id,
          belvo_credit_limit: account.credit_data?.limit || account.credit_limit || 0,
          belvo_current_bill: account.balance?.current || 0,
          manual_inputs_allowed: false,
          is_active: true
        };

        console.log('💾 Card data:', cardData);

        // Check if card already exists
        const { data: existingCard } = await supabase
          .from('cards')
          .select('id')
          .eq('belvo_account_id', account.id)
          .eq('organization_id', belvoLink.organization_id)
          .single();

        let error;
        if (existingCard) {
          // Update existing
          const { error: updateError } = await supabase
            .from('cards')
            .update(cardData)
            .eq('id', existingCard.id);
          error = updateError;
          console.log('🔄 Updating existing card:', existingCard.id);
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('cards')
            .insert(cardData)
            .select();
          error = insertError;
          console.log('➕ Inserting new card');
        }

        if (!error) {
          savedCount++;
          console.log('✅ Card saved:', account.id);
        } else {
          console.error('❌ Error saving card:', error);
        }
      } else {
        // Save as bank account
        const accountData = {
          organization_id: belvoLink.organization_id,
          user_id: belvoLink.user_id,
          name: account.name || `${account.institution?.name || 'Unknown'} - ${account.number?.slice(-4) || '0000'}`,
          bank: account.institution?.name || 'Unknown',
          account_type: mapAccountType(account.type),
          account_number: account.number || null,
          initial_balance: 0,
          current_balance: account.balance?.current || account.balance?.available || 0,
          provider: 'belvo',
          belvo_link_id: belvoLink.link_id,
          belvo_account_id: account.id,
          manual_inputs_allowed: false,
          is_active: true,
          owner_type: 'individual'
        };

        console.log('💾 Bank account data:', accountData);

        // Check if account already exists
        const { data: existingAccount } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('belvo_account_id', account.id)
          .eq('organization_id', belvoLink.organization_id)
          .single();

        let error;
        if (existingAccount) {
          // Update existing
          const { error: updateError } = await supabase
            .from('bank_accounts')
            .update({
              ...accountData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAccount.id);
          error = updateError;
          console.log('🔄 Updating existing account:', existingAccount.id);
        } else {
          // Insert new
          const { error: insertError, data } = await supabase
            .from('bank_accounts')
            .insert(accountData)
            .select();
          error = insertError;
          console.log('➕ Inserting new account', data);
        }

        if (!error) {
          savedCount++;
          console.log('✅ Bank account saved:', account.id);
        } else {
          console.error('❌ Error saving bank account:', error);
        }
      }
    } catch (error) {
      console.error('❌ Exception saving account:', error);
    }
  }

  console.log(`✅ Total saved: ${savedCount}/${accounts.length} accounts`);
  return savedCount;
}

// Map Belvo account type to FinTrack type
function mapAccountType(belvoType) {
  const typeMap = {
    'checking': 'checking',
    'savings': 'savings',
    'credit_card': 'credit',
    'investment': 'investment',
    'loan': 'loan'
  };
  return typeMap[belvoType] || 'checking';
}

// Save transactions to database
async function saveTransactions(belvoLink, transactions) {
  let savedCount = 0;

  for (const transaction of transactions) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('belvo_transaction_id', transaction.id)
        .single();

      if (existing) continue; // Skip duplicates

      // Determine transaction type
      const isOutflow = transaction.type === 'OUTFLOW' || transaction.amount < 0;
      const amount = Math.abs(transaction.amount);

      // Map category
      const category = mapBelvoCategory(transaction.category);

      // Get the account this transaction belongs to
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('belvo_account_id', transaction.account)
        .single();

      if (!account) continue; // Skip if account not found

      if (isOutflow) {
        // Save as expense
        const { error } = await supabase
          .from('expenses')
          .insert({
            organization_id: belvoLink.organization_id,
            user_id: belvoLink.user_id,
            description: transaction.description || 'Transação Belvo',
            amount: amount,
            date: transaction.value_date || transaction.accounting_date,
            category: category,
            payment_method: 'bank_transfer',
            payment_method_id: account.id,
            belvo_transaction_id: transaction.id,
            belvo_account_id: transaction.account,
            transaction_channel: transaction.type,
            is_belvo_payload: true,
            status: 'paid'
          });

        if (!error) savedCount++;
      } else {
        // Save as income (if you have incomes table)
        // For now, skip or save as negative expense
        savedCount++;
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  }

  console.log(`✅ Saved ${savedCount} transactions`);
  return savedCount;
}

// Map Belvo category to FinTrack category
function mapBelvoCategory(belvoCategory) {
  const categoryMap = {
    'Food & Groceries': 'Alimentação',
    'Transport & Travel': 'Transporte',
    'Home & Utilities': 'Moradia',
    'Healthcare & Wellness': 'Saúde',
    'Entertainment & Leisure': 'Lazer',
    'Shopping & Retail': 'Compras',
    'Bills & Utilities': 'Contas',
    'Online Services': 'Assinaturas'
  };

  return categoryMap[belvoCategory] || 'Outros';
}

// Process new transactions
async function processNewTransactions(belvoLink, data) {
  console.log('🔄 Processing new transactions');
  return await processHistoricalUpdate(belvoLink, data);
}

// Process consent expired
async function processConsentExpired(belvoLink) {
  console.log('⚠️ Processing consent expired');

  await supabase
    .from('belvo_links')
    .update({ 
      status: 'expired',
      consent_expiration: new Date().toISOString()
    })
    .eq('link_id', belvoLink.link_id);

  return { success: true, message: 'Consent marked as expired' };
}

