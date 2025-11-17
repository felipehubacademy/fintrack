/**
 * GET /api/belvo/links/[id]
 * Gets a specific Belvo link
 * 
 * DELETE /api/belvo/links/[id]
 * Revokes a Belvo link and marks accounts as inactive
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
  const { id } = req.query;

  if (req.method === 'GET') {
    return handleGet(req, res, id);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res, id) {
  try {
    const { data: link, error } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    return res.status(200).json({ success: true, link });
  } catch (error) {
    console.error('Error fetching Belvo link:', error);
    return res.status(500).json({ error: 'Failed to fetch link' });
  }
}

async function handleDelete(req, res, id) {
  try {
    // Get the link first
    const { data: link, error: fetchError } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Revoke link in Belvo
    try {
      await axios.delete(
        `${BELVO_API_URL}/api/links/${link.link_id}/`,
        {
          auth: {
            username: BELVO_SECRET_ID,
            password: BELVO_SECRET_PASSWORD
          }
        }
      );
    } catch (belvoError) {
      console.error('Error revoking Belvo link:', belvoError.response?.data || belvoError.message);
      // Continue even if Belvo deletion fails
    }

    // Mark associated bank accounts as inactive
    await supabase
      .from('bank_accounts')
      .update({ is_active: false })
      .eq('belvo_link_id', id);

    // Mark associated cards as inactive
    await supabase
      .from('cards')
      .update({ is_active: false })
      .eq('belvo_link_id', id);

    // Soft delete the link (update status)
    const { error: updateError } = await supabase
      .from('belvo_links')
      .update({ 
        status: 'error',
        error_message: 'Link revoked by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Link revoked successfully' 
    });
  } catch (error) {
    console.error('Error deleting Belvo link:', error);
    return res.status(500).json({ error: 'Failed to delete link' });
  }
}
