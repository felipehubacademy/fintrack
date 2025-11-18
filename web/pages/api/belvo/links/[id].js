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
    // Delete/revoke link
    try {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from('belvo_links')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('link_id', id)
        .eq('organization_id', organization_id);

      if (error) {
        console.error('Error deleting link:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to delete link' 
        });
      }

      // Also mark associated accounts as inactive
      await supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('belvo_link_id', id)
        .eq('organization_id', organization_id);

      await supabase
        .from('cards')
        .update({ is_active: false })
        .eq('belvo_link_id', id)
        .eq('organization_id', organization_id);

      return res.status(200).json({
        success: true,
        message: 'Link deleted successfully'
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

