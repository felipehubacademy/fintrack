import fetch from 'node-fetch';

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

/**
 * Get Pluggy API key by authenticating with client credentials
 */
export async function getPluggyApiKey() {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  const response = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pluggy auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.apiKey;
}

/**
 * Fetch accounts from Pluggy connection
 */
export async function fetchAccounts(apiKey, connectionId) {
  const response = await fetch(
    `${PLUGGY_BASE_URL}/accounts?itemId=${connectionId}`,
    {
      headers: {
        'X-API-KEY': apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Fetch transactions from Pluggy account
 */
export async function fetchTransactions(apiKey, accountId, fromDate = null) {
  let url = `${PLUGGY_BASE_URL}/transactions?accountId=${accountId}`;
  
  if (fromDate) {
    url += `&from=${fromDate}`;
  }

  const response = await fetch(url, {
    headers: {
      'X-API-KEY': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Get all transactions from the connection
 */
export async function getAllTransactions(connectionId, fromDate = null) {
  const apiKey = await getPluggyApiKey();
  const accounts = await fetchAccounts(apiKey, connectionId);
  
  let allTransactions = [];
  
  for (const account of accounts) {
    const transactions = await fetchTransactions(apiKey, account.id, fromDate);
    allTransactions = allTransactions.concat(
      transactions.map(t => ({
        ...t,
        accountId: account.id,
        accountName: account.name,
      }))
    );
  }
  
  return allTransactions;
}

