/**
 * API: Mark All Notifications as Read
 * Marcar todas as notificações do usuário como lidas
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { user_id, organization_id } = req.body;

    if (!user_id || !organization_id) {
      return res.status(400).json({ 
        error: 'user_id e organization_id são obrigatórios' 
      });
    }

    // Marcar todas como lidas
    const { data: notifications, error } = await supabase
      .from('notifications')
      .update({ 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', user_id)
      .eq('organization_id', organization_id)
      .is('read_at', null)
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `${notifications.length} notificações marcadas como lidas`,
      count: notifications.length
    });

  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
