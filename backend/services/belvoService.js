/**
 * Belvo Service
 * Handles communication with Belvo API
 */

import axios from 'axios';

const BELVO_API_URL = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';
const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID;
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD;

// Basic auth for Belvo API
const belvoAuth = {
  username: BELVO_SECRET_ID,
  password: BELVO_SECRET_PASSWORD
};

/**
 * Create a widget access token for user
 * @param {string} externalId - Unique user identifier (CPF or user_id)
 * @returns {Promise<object>} { access_token, widget_url }
 */
export async function createWidgetToken(externalId) {
  try {
    const response = await axios.post(
      `${BELVO_API_URL}/api/token/`,
      {
        id: externalId,
        password: externalId, // Using same ID as password for simplicity
        scopes: 'read_accounts,read_transactions,read_balances',
        widget: {
          branding: {
            company_name: 'FinTrack',
            company_logo: 'https://your-logo-url.com/logo.png'
          }
        }
      },
      { auth: belvoAuth }
    );
    
    return {
      access_token: response.data.access,
      widget_url: `https://widget.belvo.com?access_token=${response.data.access}`
    };
  } catch (error) {
    console.error('Error creating Belvo widget token:', error.response?.data || error.message);
    throw new Error('Failed to create Belvo widget session');
  }
}

/**
 * Get all links for an institution
 * @param {string} linkId - Belvo link ID
 * @returns {Promise<object>} Link details
 */
export async function getLink(linkId) {
  try {
    const response = await axios.get(
      `${BELVO_API_URL}/api/links/${linkId}/`,
      { auth: belvoAuth }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching Belvo link:', error.response?.data || error.message);
    throw new Error('Failed to fetch Belvo link');
  }
}

/**
 * Trigger manual sync for a link
 * @param {string} linkId - Belvo link ID
 * @returns {Promise<object>} Updated link
 */
export async function triggerSync(linkId) {
  try {
    const response = await axios.patch(
      `${BELVO_API_URL}/api/links/${linkId}/`,
      { refresh: true },
      { auth: belvoAuth }
    );
    return response.data;
  } catch (error) {
    console.error('Error triggering Belvo sync:', error.response?.data || error.message);
    throw new Error('Failed to trigger sync');
  }
}

/**
 * Delete a link (revoke consent)
 * @param {string} linkId - Belvo link ID
 * @returns {Promise<void>}
 */
export async function deleteLink(linkId) {
  try {
    await axios.delete(
      `${BELVO_API_URL}/api/links/${linkId}/`,
      { auth: belvoAuth }
    );
  } catch (error) {
    console.error('Error deleting Belvo link:', error.response?.data || error.message);
    throw new Error('Failed to delete link');
  }
}

/**
 * Fetch accounts for a link
 * @param {string} linkId - Belvo link ID
 * @returns {Promise<array>} Array of accounts
 */
export async function fetchAccounts(linkId) {
  try {
    const response = await axios.get(
      `${BELVO_API_URL}/api/accounts/`,
      {
        auth: belvoAuth,
        params: { link: linkId }
      }
    );
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching Belvo accounts:', error.response?.data || error.message);
    throw new Error('Failed to fetch accounts');
  }
}

/**
 * Fetch transactions for a link
 * @param {string} linkId - Belvo link ID
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @returns {Promise<array>} Array of transactions
 */
export async function fetchTransactions(linkId, dateFrom, dateTo) {
  try {
    const response = await axios.get(
      `${BELVO_API_URL}/api/transactions/`,
      {
        auth: belvoAuth,
        params: {
          link: linkId,
          date_from: dateFrom,
          date_to: dateTo
        }
      }
    );
    return response.data.results || response.data;
  } catch (error) {
    console.error('Error fetching Belvo transactions:', error.response?.data || error.message);
    throw new Error('Failed to fetch transactions');
  }
}

export default {
  createWidgetToken,
  getLink,
  triggerSync,
  deleteLink,
  fetchAccounts,
  fetchTransactions
};
