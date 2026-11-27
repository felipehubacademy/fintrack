/**
 * API: Get Interested Users Count (public, read-only, aggregate only)
 * Retornar contador total de interessados (para exibir no modal)
 */

import { rateLimit } from '../../../lib/apiAuth.js';
import { supabaseAdmin as supabase } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  if (!rateLimit(req, res, { key: 'interested-count', limit: 60, windowMs: 60_000 })) return;

  try {
    // Contar total de registros existentes
    const { count, error: countError } = await supabase
      .from('interested_users')
      .select('id', { count: 'exact', head: true });

    if (countError) throw countError;

    // Retornar contador (contagem + 100)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      count: (count || 0) + 100
    });
  } catch (error) {
    console.error('Erro ao buscar contador:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
}
