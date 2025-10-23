/**
 * API: Mark Notification as Read
 * Marcar notificação como lida
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { notification_id, user_id } = req.body;

    if (!notification_id || !user_id) {
      return res.status(400).json({ 
        error: 'notification_id e user_id são obrigatórios' 
      });
    }

    // Marcar como lida
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ 
        read_at: new Date().toISOString() 
      })
      .eq('id', notification_id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;

    if (!notification) {
      return res.status(404).json({ 
        error: 'Notificação não encontrada' 
      });
    }

    return res.status(200).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
