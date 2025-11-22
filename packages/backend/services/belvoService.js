// ============================================================================
// Belvo Service
// Handles all interactions with Belvo Open Finance API
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

class BelvoService {
  constructor() {
    // Belvo API Configuration
    this.secretId = process.env.BELVO_SECRET_ID;
    this.secretPassword = process.env.BELVO_SECRET_PASSWORD;
    this.apiUrl = process.env.BELVO_API_URL || 'https://api.belvo.com';
    this.widgetUrl = process.env.BELVO_WIDGET_URL || 'https://widget.belvo.com';
    
    if (!this.secretId || !this.secretPassword) {
      console.warn('⚠️  Belvo credentials not configured');
    }
    
    // Supabase client for database operations
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ BelvoService initialized');
  }

  /**
   * Get Basic Auth header for Belvo API
   * @returns {string} Base64 encoded credentials
   */
  getAuthHeader() {
    const credentials = `${this.secretId}:${this.secretPassword}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Make authenticated request to Belvo API
   * @param {string} endpoint - API endpoint (e.g., '/token/')
   * @param {object} options - Fetch options
   * @returns {Promise<object>}
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Belvo API Error:', response.status, errorBody);
      throw new Error(`Belvo API error: ${response.status} - ${errorBody}`);
    }

    return await response.json();
  }

  /**
   * Generate widget access token for user
   * @param {string} cpf - User's CPF (11 digits, no formatting)
   * @param {string} fullName - User's full name
   * @param {object} options - Additional options (institution, scopes, etc)
   * @returns {Promise<object>} { access_token, expires_in, widget_url }
   */
  async generateWidgetSession(cpf, fullName, options = {}) {
    try {
      console.log('🔐 Generating Belvo widget session for:', cpf);
      
      const payload = {
        // External ID to identify user in your system
        external_id: cpf,
        // Widget configuration
        widget: {
          branding: {
            company_name: 'FinTrack',
            // company_logo_url: 'https://yourapp.com/logo.png',
            // primary_color: '#3B82F6'
          },
          // Pre-select institution if provided
          ...(options.institution && { institution: options.institution }),
          // Scopes (what data to request)
          scopes: options.scopes || [
            'read_accounts',
            'read_transactions',
            'read_balances',
            'read_bills'
          ]
        },
        // User information for consent
        callback_url: options.callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bank-accounts`,
        // Locale
        locale: 'pt-BR'
      };

      const response = await this.makeRequest('/token/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('✅ Widget session created');
      
      return {
        access_token: response.access,
        expires_in: response.expires_in || 3600,
        widget_url: `${this.widgetUrl}?access=${response.access}`,
        refresh_token: response.refresh
      };
    } catch (error) {
      console.error('❌ Error generating widget session:', error);
      throw error;
    }
  }

  /**
   * Get all links for an organization
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of belvo_links records
   */
  async getLinks(organizationId) {
    try {
      const { data, error } = await this.supabase
        .from('belvo_links')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching links:', error);
      throw error;
    }
  }

  /**
   * Get link details from Belvo API
   * @param {string} linkId - Belvo link ID
   * @returns {Promise<object>} Link details from Belvo
   */
  async getLinkFromBelvo(linkId) {
    try {
      return await this.makeRequest(`/links/${linkId}/`, {
        method: 'GET'
      });
    } catch (error) {
      console.error('❌ Error fetching link from Belvo:', error);
      throw error;
    }
  }

  /**
   * Create or update link in database
   * @param {object} linkData - Link information
   * @returns {Promise<object>} Created/updated link record
   */
  async saveLinkToDatabase(linkData) {
    try {
      const { data, error } = await this.supabase
        .from('belvo_links')
        .upsert({
          link_id: linkData.link_id,
          organization_id: linkData.organization_id,
          user_id: linkData.user_id,
          institution_name: linkData.institution_name,
          status: linkData.status || 'pending_sync',
          consent_expiration: linkData.consent_expiration,
          last_sync_at: linkData.last_sync_at,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'link_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Link saved to database:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error saving link to database:', error);
      throw error;
    }
  }

  /**
   * Delete link (revoke consent) from Belvo and soft-delete locally
   * @param {string} linkId - Belvo link ID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<object>} Result of deletion
   */
  async deleteLink(linkId, organizationId) {
    try {
      console.log('🗑️  Deleting Belvo link:', linkId);
      
      // 1. Delete from Belvo API (revokes consent)
      try {
        await this.makeRequest(`/links/${linkId}/`, {
          method: 'DELETE'
        });
        console.log('✅ Link deleted from Belvo');
      } catch (error) {
        // If already deleted in Belvo, continue with local cleanup
        console.warn('⚠️  Link may already be deleted from Belvo:', error.message);
      }
      
      // 2. Soft-delete accounts and cards associated with this link
      const { error: accountsError } = await this.supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('belvo_link_id', linkId)
        .eq('organization_id', organizationId);
      
      if (accountsError) {
        console.error('Error deactivating bank accounts:', accountsError);
      }
      
      const { error: cardsError } = await this.supabase
        .from('cards')
        .update({ is_active: false })
        .eq('belvo_link_id', linkId)
        .eq('organization_id', organizationId);
      
      if (cardsError) {
        console.error('Error deactivating cards:', cardsError);
      }
      
      // 3. Update link status
      const { data, error } = await this.supabase
        .from('belvo_links')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('link_id', linkId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Link and associated accounts/cards deactivated');
      return { success: true, link: data };
    } catch (error) {
      console.error('❌ Error deleting link:', error);
      throw error;
    }
  }

  /**
   * Manually trigger sync for a link
   * @param {string} linkId - Belvo link ID
   * @returns {Promise<object>} Sync result
   */
  async syncLink(linkId) {
    try {
      console.log('🔄 Triggering manual sync for link:', linkId);
      
      // Trigger refresh in Belvo
      const response = await this.makeRequest(`/links/${linkId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          refresh: true
        })
      });
      
      console.log('✅ Sync triggered successfully');
      return response;
    } catch (error) {
      console.error('❌ Error triggering sync:', error);
      throw error;
    }
  }

  /**
   * Fetch accounts from Belvo for a link
   * @param {string} linkId - Belvo link ID
   * @returns {Promise<Array>} Array of accounts
   */
  async fetchAccounts(linkId) {
    try {
      const response = await this.makeRequest(`/accounts/?link=${linkId}`, {
        method: 'GET'
      });
      
      return response.results || response || [];
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      throw error;
    }
  }

  /**
   * Fetch transactions from Belvo for a link
   * @param {string} linkId - Belvo link ID
   * @param {object} filters - Date filters { date_from, date_to }
   * @returns {Promise<Array>} Array of transactions
   */
  async fetchTransactions(linkId, filters = {}) {
    try {
      const params = new URLSearchParams({
        link: linkId,
        ...filters
      });
      
      const response = await this.makeRequest(`/transactions/?${params.toString()}`, {
        method: 'GET'
      });
      
      return response.results || response || [];
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Fetch balances from Belvo for a link
   * @param {string} linkId - Belvo link ID
   * @returns {Promise<Array>} Array of balances
   */
  async fetchBalances(linkId) {
    try {
      const response = await this.makeRequest(`/balances/?link=${linkId}`, {
        method: 'GET'
      });
      
      return response.results || response || [];
    } catch (error) {
      console.error('❌ Error fetching balances:', error);
      throw error;
    }
  }

  /**
   * Fetch credit card bills from Belvo for a link
   * @param {string} linkId - Belvo link ID
   * @returns {Promise<Array>} Array of bills
   */
  async fetchBills(linkId) {
    try {
      const response = await this.makeRequest(`/transactions-credit-card-bills/?link=${linkId}`, {
        method: 'GET'
      });
      
      return response.results || response || [];
    } catch (error) {
      console.error('❌ Error fetching bills:', error);
      throw error;
    }
  }

  /**
   * Get available institutions in Brazil
   * @returns {Promise<Array>} Array of institutions
   */
  async getInstitutions() {
    try {
      const response = await this.makeRequest('/institutions/?country_code=BR', {
        method: 'GET'
      });
      
      return response.results || response || [];
    } catch (error) {
      console.error('❌ Error fetching institutions:', error);
      throw error;
    }
  }

  /**
   * Update link status in database
   * @param {string} linkId - Belvo link ID
   * @param {string} status - New status
   * @param {object} additionalData - Additional fields to update
   * @returns {Promise<object>}
   */
  async updateLinkStatus(linkId, status, additionalData = {}) {
    try {
      const { data, error } = await this.supabase
        .from('belvo_links')
        .update({
          status,
          ...additionalData,
          updated_at: new Date().toISOString()
        })
        .eq('link_id', linkId)
        .select()
        .single();
      
      if (error) throw error;
      
      console.log(`✅ Link status updated to: ${status}`);
      return data;
    } catch (error) {
      console.error('❌ Error updating link status:', error);
      throw error;
    }
  }
}

// Export singleton instance
let belvoServiceInstance = null;

function getBelvoService() {
  if (!belvoServiceInstance) {
    belvoServiceInstance = new BelvoService();
  }
  return belvoServiceInstance;
}

module.exports = {
  BelvoService,
  getBelvoService
};

