// ============================================================================
// Belvo API Routes
// Handles all Belvo Open Finance endpoints
// ============================================================================

const { getBelvoService } = require('../services/belvoService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * POST /api/belvo/widget-session
 * Generates access token for Belvo Hosted Widget
 */
async function generateWidgetSession(req, res) {
  try {
    const { cpf, full_name, organization_id, user_id, institution } = req.body;

    // Validation
    if (!cpf || !full_name) {
      return res.status(400).json({
        error: 'CPF e nome completo são obrigatórios'
      });
    }

    // Validate CPF format (11 digits, no formatting)
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({
        error: 'CPF inválido. Deve conter 11 dígitos'
      });
    }

    const belvoService = getBelvoService();
    
    // Generate widget session
    const session = await belvoService.generateWidgetSession(cleanCpf, full_name, {
      institution,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/bank-accounts?belvo=success`
    });

    console.log('✅ Widget session created for CPF:', cleanCpf);

    return res.status(200).json({
      success: true,
      access_token: session.access_token,
      widget_url: session.widget_url,
      expires_in: session.expires_in
    });
  } catch (error) {
    console.error('❌ Error generating widget session:', error);
    return res.status(500).json({
      error: 'Erro ao gerar sessão do widget Belvo',
      details: error.message
    });
  }
}

/**
 * GET /api/belvo/links
 * Lists all Belvo links for an organization
 */
async function listLinks(req, res) {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({
        error: 'organization_id é obrigatório'
      });
    }

    const belvoService = getBelvoService();
    const links = await belvoService.getLinks(organization_id);

    return res.status(200).json({
      success: true,
      links
    });
  } catch (error) {
    console.error('❌ Error listing links:', error);
    return res.status(500).json({
      error: 'Erro ao listar conexões Belvo',
      details: error.message
    });
  }
}

/**
 * GET /api/belvo/links/:id
 * Gets details of a specific link
 */
async function getLinkDetails(req, res) {
  try {
    const { id: linkId } = req.params;
    const { organization_id } = req.query;

    if (!linkId || !organization_id) {
      return res.status(400).json({
        error: 'Link ID e organization_id são obrigatórios'
      });
    }

    // Get from database
    const { data: link, error } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('link_id', linkId)
      .eq('organization_id', organization_id)
      .single();

    if (error || !link) {
      return res.status(404).json({
        error: 'Link não encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      link
    });
  } catch (error) {
    console.error('❌ Error getting link details:', error);
    return res.status(500).json({
      error: 'Erro ao buscar detalhes do link',
      details: error.message
    });
  }
}

/**
 * POST /api/belvo/links/:id/sync
 * Manually triggers sync for a link
 */
async function syncLink(req, res) {
  try {
    const { id: linkId } = req.params;
    const { organization_id } = req.body;

    if (!linkId || !organization_id) {
      return res.status(400).json({
        error: 'Link ID e organization_id são obrigatórios'
      });
    }

    // Verify link belongs to organization
    const { data: link, error: linkError } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('link_id', linkId)
      .eq('organization_id', organization_id)
      .single();

    if (linkError || !link) {
      return res.status(404).json({
        error: 'Link não encontrado ou não pertence a esta organização'
      });
    }

    const belvoService = getBelvoService();
    
    // Trigger sync
    await belvoService.syncLink(linkId);
    
    // Update sync timestamp
    await belvoService.updateLinkStatus(linkId, 'synced', {
      last_sync_at: new Date().toISOString()
    });

    console.log('✅ Manual sync triggered for link:', linkId);

    return res.status(200).json({
      success: true,
      message: 'Sincronização iniciada. Aguarde alguns instantes.'
    });
  } catch (error) {
    console.error('❌ Error syncing link:', error);
    return res.status(500).json({
      error: 'Erro ao sincronizar link',
      details: error.message
    });
  }
}

/**
 * DELETE /api/belvo/links/:id
 * Revokes consent and soft-deletes link
 */
async function deleteLink(req, res) {
  try {
    const { id: linkId } = req.params;
    const { organization_id } = req.body;

    if (!linkId || !organization_id) {
      return res.status(400).json({
        error: 'Link ID e organization_id são obrigatórios'
      });
    }

    // Verify link belongs to organization
    const { data: link, error: linkError } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('link_id', linkId)
      .eq('organization_id', organization_id)
      .single();

    if (linkError || !link) {
      return res.status(404).json({
        error: 'Link não encontrado ou não pertence a esta organização'
      });
    }

    const belvoService = getBelvoService();
    const result = await belvoService.deleteLink(linkId, organization_id);

    console.log('✅ Link deleted:', linkId);

    return res.status(200).json({
      success: true,
      message: 'Conexão revogada com sucesso',
      result
    });
  } catch (error) {
    console.error('❌ Error deleting link:', error);
    return res.status(500).json({
      error: 'Erro ao revogar conexão',
      details: error.message
    });
  }
}

/**
 * GET /api/belvo/institutions
 * Lists available financial institutions
 */
async function listInstitutions(req, res) {
  try {
    const belvoService = getBelvoService();
    const institutions = await belvoService.getInstitutions();

    return res.status(200).json({
      success: true,
      institutions
    });
  } catch (error) {
    console.error('❌ Error listing institutions:', error);
    return res.status(500).json({
      error: 'Erro ao listar instituições',
      details: error.message
    });
  }
}

/**
 * POST /api/belvo/transactions/pull
 * Manual fallback to pull transactions
 */
async function pullTransactions(req, res) {
  try {
    const { link_id, organization_id, date_from, date_to } = req.body;

    if (!link_id || !organization_id) {
      return res.status(400).json({
        error: 'link_id e organization_id são obrigatórios'
      });
    }

    // Verify link belongs to organization
    const { data: link, error: linkError } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('link_id', link_id)
      .eq('organization_id', organization_id)
      .single();

    if (linkError || !link) {
      return res.status(404).json({
        error: 'Link não encontrado'
      });
    }

    const belvoService = getBelvoService();
    
    // Fetch data
    const [accounts, transactions, bills] = await Promise.all([
      belvoService.fetchAccounts(link_id),
      belvoService.fetchTransactions(link_id, { date_from, date_to }),
      belvoService.fetchBills(link_id).catch(() => []) // Bills may not exist
    ]);

    console.log(`✅ Fetched data for link ${link_id}:`, {
      accounts: accounts.length,
      transactions: transactions.length,
      bills: bills.length
    });

    return res.status(200).json({
      success: true,
      data: {
        accounts,
        transactions,
        bills
      }
    });
  } catch (error) {
    console.error('❌ Error pulling transactions:', error);
    return res.status(500).json({
      error: 'Erro ao buscar transações',
      details: error.message
    });
  }
}

/**
 * POST /api/belvo/webhooks
 * Main webhook endpoint - receives events from Belvo
 */
async function handleWebhook(req, res) {
  try {
    const webhook = req.body;
    
    console.log('📥 Received Belvo webhook:', webhook.webhook_type);
    
    // Validate webhook has required fields
    if (!webhook.webhook_id || !webhook.webhook_type) {
      return res.status(400).json({
        error: 'Invalid webhook payload'
      });
    }
    
    // TODO: Validate webhook signature (Belvo provides this)
    // const signature = req.headers['x-belvo-signature'];
    // if (!validateSignature(webhook, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }
    
    // Import processor
    const { getWebhookProcessor } = require('../services/belvoWebhookProcessor');
    const processor = getWebhookProcessor();
    
    // Process webhook asynchronously
    const result = await processor.processWebhook(webhook);
    
    console.log('✅ Webhook processed:', result);
    
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      result
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    
    // Return 200 anyway to prevent Belvo from retrying
    // (log the error for investigation)
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Export route handlers
 */
module.exports = {
  generateWidgetSession,
  listLinks,
  getLinkDetails,
  syncLink,
  deleteLink,
  listInstitutions,
  pullTransactions,
  handleWebhook
};

