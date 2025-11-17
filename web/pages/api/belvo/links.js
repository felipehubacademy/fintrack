/**
 * GET /api/belvo/links
 * Lists all Belvo links for an organization
 * 
 * POST /api/belvo/links
 * Creates a new Belvo link record after user connects via widget
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req, res) {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const { data: links, error } = await supabase
      .from('belvo_links')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, links });
  } catch (error) {
    console.error('Error fetching Belvo links:', error);
    return res.status(500).json({ error: 'Failed to fetch links' });
  }
}

async function handlePost(req, res) {
  try {
    const { userId, organizationId, linkId, institutionName, metadata } = req.body;

    if (!userId || !organizationId || !linkId || !institutionName) {
      return res.status(400).json({ 
        error: 'userId, organizationId, linkId, and institutionName are required' 
      });
    }

    // Create belvo_link record
    const { data: link, error } = await supabase
      .from('belvo_links')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        link_id: linkId,
        institution_name: institutionName,
        status: 'pending_sync',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({ success: true, link });
  } catch (error) {
    console.error('Error creating Belvo link:', error);
    return res.status(500).json({ 
      error: 'Failed to create link',
      details: error.message 
    });
  }
}
