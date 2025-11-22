import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;
  const { organization_id } = req.query;

  if (!organization_id) {
    return res.status(400).json({ error: 'organization_id is required' });
  }

  if (req.method === 'GET') {
    // Get link details from database
    try {
      const { data: link, error } = await supabase
        .from('belvo_links')
        .select('*')
        .eq('link_id', id)
        .eq('organization_id', organization_id)
        .single();

      if (error) {
        console.error('Error fetching link:', error);
        return res.status(404).json({ 
          success: false,
          error: 'Link not found' 
        });
      }

      return res.status(200).json({
        success: true,
        link: link
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }

  if (req.method === 'DELETE') {
    // Delete/revoke link from Belvo API and local database
    try {
      const secretId = process.env.BELVO_SECRET_ID;
      const secretPassword = process.env.BELVO_SECRET_PASSWORD;
      const apiUrl = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';

      if (!secretId || !secretPassword) {
        console.error('Belvo credentials not configured');
        return res.status(500).json({ 
          success: false,
          error: 'Belvo credentials not configured' 
        });
      }

      // 1. First, revoke the link from Belvo API
      const auth = Buffer.from(`${secretId}:${secretPassword}`).toString('base64');
      
      console.log(`🗑️ Revoking Belvo link: ${id}`);
      const belvoResponse = await fetch(`${apiUrl}/api/links/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!belvoResponse.ok && belvoResponse.status !== 404) {
        const errorText = await belvoResponse.text();
        console.error('Error revoking link from Belvo:', belvoResponse.status, errorText);
        // Continue with local deletion even if Belvo API fails
      } else {
        console.log('✅ Link revoked from Belvo API');
      }

      // 2. Get the link to use service role for deletion
      const { data: link } = await supabase
        .from('belvo_links')
        .select('*')
        .eq('link_id', id)
        .eq('organization_id', organization_id)
        .single();

      if (!link) {
        return res.status(404).json({ 
          success: false,
          error: 'Link not found' 
        });
      }

      // 3. Use service role to bypass RLS for deletion
      const { createClient } = require('@supabase/supabase-js');
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

      // 4. Mark link as deleted
      const { error: linkError } = await supabaseAdmin
        .from('belvo_links')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('link_id', id)
        .eq('organization_id', organization_id);

      if (linkError) {
        console.error('Error deleting link:', linkError);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to delete link' 
        });
      }

      // 5. Mark associated accounts and cards as inactive
      const { error: accountsError } = await supabaseAdmin
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('belvo_link_id', id)
        .eq('organization_id', organization_id);

      if (accountsError) {
        console.error('Error deactivating accounts:', accountsError);
      }

      const { error: cardsError } = await supabaseAdmin
        .from('cards')
        .update({ is_active: false })
        .eq('belvo_link_id', id)
        .eq('organization_id', organization_id);

      if (cardsError) {
        console.error('Error deactivating cards:', cardsError);
      }

      console.log('✅ Link and associated accounts/cards deactivated successfully');

      return res.status(200).json({
        success: true,
        message: 'Link desconectado com sucesso. Todas as contas e cartões associados foram desativados.'
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

