/**
 * POST /api/belvo/transactions/pull
 * Manual fallback to pull transactions from Belvo if webhook fails
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BELVO_API_URL = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';
const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID;
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { linkId, dateFrom, dateTo } = req.body;

    if (!linkId) {
      return res.status(400).json({ error: 'linkId is required' });
    }

    // Get the link from database
    const { data: link, error: linkError } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('id', linkId)
      .single();

    if (linkError || !link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Default to last 12 months if not specified
    const endDate = dateTo || new Date().toISOString().split('T')[0];
    const startDate = dateFrom || new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0];

    // Fetch accounts from Belvo
    const accountsResponse = await axios.get(
      `${BELVO_API_URL}/api/accounts/`,
      {
        auth: {
          username: BELVO_SECRET_ID,
          password: BELVO_SECRET_PASSWORD
        },
        params: { link: link.link_id }
      }
    );

    const accounts = accountsResponse.data.results || accountsResponse.data;

    // Fetch transactions from Belvo
    const transactionsResponse = await axios.get(
      `${BELVO_API_URL}/api/transactions/`,
      {
        auth: {
          username: BELVO_SECRET_ID,
          password: BELVO_SECRET_PASSWORD
        },
        params: {
          link: link.link_id,
          date_from: startDate,
          date_to: endDate
        }
      }
    );

    const transactions = transactionsResponse.data.results || transactionsResponse.data;

    // Process the data using webhook processor logic
    // We'll simulate a webhook payload and call the webhook endpoint internally
    const simulatedWebhook = {
      webhook_id: `manual_pull_${Date.now()}`,
      webhook_type: 'historical_update',
      link_id: link.link_id,
      resource_type: 'ACCOUNTS',
      accounts: accounts
    };

    // Process accounts
    const accountsUrl = `${req.headers.host}/api/belvo/webhooks`;
    await axios.post(`http://${accountsUrl}`, simulatedWebhook);

    // Process transactions
    const transactionsWebhook = {
      webhook_id: `manual_pull_txn_${Date.now()}`,
      webhook_type: 'historical_update',
      link_id: link.link_id,
      resource_type: 'TRANSACTIONS',
      transactions: transactions
    };

    await axios.post(`http://${accountsUrl}`, transactionsWebhook);

    return res.status(200).json({
      success: true,
      message: 'Data pulled and processed successfully',
      accounts: accounts.length,
      transactions: transactions.length
    });
  } catch (error) {
    console.error('Error pulling Belvo data:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to pull data',
      details: error.response?.data || error.message
    });
  }
}
