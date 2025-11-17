/**
 * POST /api/belvo/links/[id]/sync
 * Triggers manual sync for a Belvo link
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

  const { id } = req.query;

  try {
    // Get the link
    const { data: link, error: fetchError } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Trigger sync in Belvo
    const response = await axios.patch(
      `${BELVO_API_URL}/api/links/${link.link_id}/`,
      { refresh: true },
      {
        auth: {
          username: BELVO_SECRET_ID,
          password: BELVO_SECRET_PASSWORD
        }
      }
    );

    // Update link status
    await supabase
      .from('belvo_links')
      .update({ 
        status: 'pending_sync',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    return res.status(200).json({ 
      success: true, 
      message: 'Sync triggered successfully',
      link: response.data 
    });
  } catch (error) {
    console.error('Error triggering Belvo sync:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to trigger sync',
      details: error.response?.data || error.message
    });
  }
}
