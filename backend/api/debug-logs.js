import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar logs de debug dos últimos 30 minutos
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('state', 'debug')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return res.status(500).json({ error: 'Erro ao buscar logs' });
    }

    return res.status(200).json({
      success: true,
      logs: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Erro no endpoint debug-logs:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
