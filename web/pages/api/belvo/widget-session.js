/**
 * POST /api/belvo/widget-session
 * Creates a Belvo widget access token for user to connect their bank
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

  try {
    const { userId, organizationId, externalId } = req.body;

    if (!userId || !organizationId) {
      return res.status(400).json({ error: 'userId and organizationId are required' });
    }

    // Use userId as external ID if not provided
    const userExternalId = externalId || userId;

    // Create widget token via Belvo API
    const response = await axios.post(
      `${BELVO_API_URL}/api/token/`,
      {
        id: userExternalId,
        password: userExternalId,
        scopes: 'read_accounts,read_transactions,read_balances',
        widget: {
          branding: {
            company_name: 'FinTrack',
            company_logo: ''
          }
        }
      },
      {
        auth: {
          username: BELVO_SECRET_ID,
          password: BELVO_SECRET_PASSWORD
        }
      }
    );

    const accessToken = response.data.access;

    return res.status(200).json({
      success: true,
      access_token: accessToken,
      widget_url: `https://widget.belvo.com?access_token=${accessToken}`
    });
  } catch (error) {
    console.error('Error creating Belvo widget session:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Failed to create widget session',
      details: error.response?.data || error.message
    });
  }
}
