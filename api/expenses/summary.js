import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * API: /api/expenses/summary
 * Retorna resumo consolidado de todas as despesas (cartão + geral)
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Usar função SQL do Supabase
    const { data, error } = await supabase.rpc('get_monthly_summary', {
      target_month: `${targetMonth}-01`,
    });

    if (error) throw error;

    const summary = data[0];

    return res.status(200).json({
      success: true,
      month: targetMonth,
      card: {
        felipe: parseFloat(summary.card_felipe || 0),
        leticia: parseFloat(summary.card_leticia || 0),
        shared: parseFloat(summary.card_shared || 0),
        total: parseFloat(summary.card_total || 0),
      },
      general: {
        felipe: parseFloat(summary.general_felipe || 0),
        leticia: parseFloat(summary.general_leticia || 0),
        shared: parseFloat(summary.general_shared || 0),
        total: parseFloat(summary.general_total || 0),
      },
      totals: {
        felipe: parseFloat(summary.felipe_individual || 0),
        leticia: parseFloat(summary.leticia_individual || 0),
        grand_total: parseFloat(summary.grand_total || 0),
      },
    });
  } catch (error) {
    console.error('Error in /api/expenses/summary:', error);
    return res.status(500).json({ error: error.message });
  }
}

