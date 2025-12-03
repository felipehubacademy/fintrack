import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { link_id, organization_id, user_id, institution_name } = req.body;

    if (!link_id || !organization_id || !user_id) {
      return res.status(400).json({
        error: 'Missing required fields: link_id, organization_id, user_id'
      });
    }

    console.log('💾 Saving Belvo link:', link_id);

    // Check if link already exists (including status)
    const { data: existing } = await supabase
      .from('belvo_links')
      .select('id, status')
      .eq('link_id', link_id)
      .single();

    if (existing) {
      // Don't reactivate deleted links - user must explicitly reconnect
      if (existing.status === 'deleted') {
        console.log('⚠️  Link was previously deleted, not reactivating. User must reconnect explicitly.');
        return res.status(400).json({
          success: false,
          error: 'Este link foi desconectado anteriormente. Por favor, conecte novamente através do widget Belvo.',
          requires_reconnect: true
        });
      }

      console.log('Link already exists, updating status');
      const { error: updateError } = await supabase
        .from('belvo_links')
        .update({ 
          status: 'pending_sync',
          last_sync_at: new Date().toISOString()
        })
        .eq('link_id', link_id);

      if (updateError) {
        console.error('Error updating link:', updateError);
      }

      return res.status(200).json({
        success: true,
        message: 'Link already exists'
      });
    }

    // Insert new link
    const { data: newLink, error } = await supabase
      .from('belvo_links')
      .insert({
        organization_id: organization_id,
        user_id: user_id,
        link_id: link_id,
        institution_name: institution_name || 'Unknown',
        status: 'pending_sync',
        last_sync_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving link:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save link',
        details: error.message
      });
    }

    console.log('✅ Link saved successfully');

    return res.status(200).json({
      success: true,
      link: newLink
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

