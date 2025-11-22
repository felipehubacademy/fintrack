/**
 * API: Get Interested Users Count
 * Retornar contador total de interessados (para exibir no modal)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Contar total de registros existentes
    const { count, error: countError } = await supabase
      .from('interested_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Erro ao contar registros:', countError);
      throw countError;
    }

    // Retornar contador (contagem + 100)
    const totalCount = (count || 0) + 100;

    return res.status(200).json({
      success: true,
      count: totalCount
    });

  } catch (error) {
    console.error('Erro ao buscar contador:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

