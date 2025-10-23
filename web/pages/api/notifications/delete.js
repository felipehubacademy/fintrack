/**
 * API: Delete Notification
 * Deletar notificação
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { notification_id, user_id } = req.body;

    if (!notification_id || !user_id) {
      return res.status(400).json({ 
        error: 'notification_id e user_id são obrigatórios' 
      });
    }

    // Deletar notificação
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification_id)
      .eq('user_id', user_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Notificação deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
