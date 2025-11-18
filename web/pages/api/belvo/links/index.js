import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { organization_id } = req.query;

  if (!organization_id) {
    return res.status(400).json({ error: 'organization_id is required' });
  }

  try {
    const { data: links, error } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('organization_id', organization_id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching links:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch links' 
      });
    }

    return res.status(200).json({
      success: true,
      links: links || []
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}

