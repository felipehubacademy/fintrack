import { createClient } from '@supabase/supabase-js';

// Save selected accounts to database
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { linkId, accountIds, organizationId, userId } = req.body;

  if (!linkId || !accountIds || !Array.isArray(accountIds) || !organizationId || !userId) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields' 
    });
  }

  try {
    // Use service role to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return res.status(500).json({ 
        success: false,
        error: 'Service role key not configured' 
      });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey
    );

    // First, get the Belvo link info
    const { data: belvoLink, error: linkError } = await supabaseAdmin
      .from('belvo_links')
      .select('*')
      .eq('link_id', linkId)
      .eq('organization_id', organizationId)
      .single();

    if (linkError || !belvoLink) {
      console.error('Belvo link not found:', linkError);
      return res.status(404).json({ 
        success: false,
        error: 'Belvo link not found' 
      });
    }

    // Fetch accounts from Belvo API
    const secretId = process.env.BELVO_SECRET_ID;
    const secretPassword = process.env.BELVO_SECRET_PASSWORD;
    const apiUrl = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';

    if (!secretId || !secretPassword) {
      return res.status(500).json({ 
        success: false,
        error: 'Belvo credentials not configured' 
      });
    }

    const auth = Buffer.from(`${secretId}:${secretPassword}`).toString('base64');

    console.log(`🔍 Fetching accounts from Belvo for link: ${linkId}`);
    const accountsResponse = await fetch(`${apiUrl}/api/accounts/?link=${linkId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch accounts from Belvo');
    }

    const accountsData = await accountsResponse.json();
    const allAccounts = accountsData.results || [];

    // Filter only selected accounts
    const selectedAccounts = allAccounts.filter(acc => accountIds.includes(acc.id));

    console.log(`💾 Saving ${selectedAccounts.length} selected accounts...`);

    let savedCount = 0;
    let errors = [];

    for (const account of selectedAccounts) {
      try {
        const isCreditCard = account.category === 'CREDIT_CARD';

        if (isCreditCard) {
          // Save as card
          const cardData = {
            organization_id: organizationId,
            owner_id: userId,
            belvo_link_id: linkId,
            belvo_account_id: account.id,
            provider: 'belvo',
            name: account.name || 'Cartão',
            bank: account.institution?.display_name || account.institution?.name || 'Banco',
            holder_name: belvoLink.user_id || null,
            type: 'credit',
            credit_limit: account.credit_data?.credit_limit || null,
            billing_day: account.credit_data?.cutting_date ? parseInt(account.credit_data.cutting_date.split('-')[2]) : null,
            is_active: true
          };

          // Check if card already exists
          const { data: existing } = await supabaseAdmin
            .from('cards')
            .select('id')
            .eq('belvo_account_id', account.id)
            .eq('organization_id', organizationId)
            .single();

          if (existing) {
            // Update existing
            const { error } = await supabaseAdmin
              .from('cards')
              .update(cardData)
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabaseAdmin
              .from('cards')
              .insert([cardData]);

            if (error) throw error;
          }

          savedCount++;
        } else {
          // Save as bank account
          const accountType = mapAccountType(account.type, account.category);
          
          const accountData = {
            organization_id: organizationId,
            belvo_link_id: linkId,
            belvo_account_id: account.id,
            provider: 'belvo',
            name: account.name || 'Conta',
            bank: account.institution?.display_name || account.institution?.name || 'Banco',
            account_type: accountType,
            current_balance: account.balance?.current || account.balance?.available || 0,
            owner_type: 'individual',
            is_active: true
          };

          // Check if account already exists
          const { data: existing } = await supabaseAdmin
            .from('bank_accounts')
            .select('id')
            .eq('belvo_account_id', account.id)
            .eq('organization_id', organizationId)
            .single();

          if (existing) {
            // Update existing
            const { error } = await supabaseAdmin
              .from('bank_accounts')
              .update(accountData)
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabaseAdmin
              .from('bank_accounts')
              .insert([accountData]);

            if (error) throw error;
          }

          savedCount++;
        }
      } catch (error) {
        console.error(`Error saving account ${account.id}:`, error);
        errors.push({ accountId: account.id, error: error.message });
      }
    }

    console.log(`✅ Successfully saved ${savedCount} accounts`);

    return res.status(200).json({
      success: true,
      savedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error saving accounts:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

// Map Belvo account type/category to FinTrack type
function mapAccountType(belvoType, category) {
  if (category) {
    const categoryMap = {
      'CHECKING_ACCOUNT': 'checking',
      'SAVINGS_ACCOUNT': 'savings',
      'PENSION_FUND_ACCOUNT': 'pension',
      'LOAN_ACCOUNT': 'loan',
      'INVESTMENT_ACCOUNT': 'investment',
      'CREDIT_CARD': 'checking' // Shouldn't happen, but fallback
    };
    
    if (categoryMap[category]) {
      return categoryMap[category];
    }
  }

  // Fallback to type name analysis
  const typeLower = (belvoType || '').toLowerCase();
  
  if (typeLower.includes('poupança') || typeLower.includes('savings')) {
    return 'savings';
  }
  
  if (typeLower.includes('pgbl') || typeLower.includes('vgbl') || 
      typeLower.includes('previdência') || typeLower.includes('pension')) {
    return 'pension';
  }
  
  if (typeLower.includes('empréstimo') || typeLower.includes('financiamento') ||
      typeLower.includes('loan')) {
    return 'loan';
  }
  
  if (typeLower.includes('investimento') || typeLower.includes('investment')) {
    return 'investment';
  }

  return 'checking';
}

