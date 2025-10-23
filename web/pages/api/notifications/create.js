/**
 * API: Create Notification
 * Criar notificação in-app
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { user_id, organization_id, type, title, message, data, priority = 'normal' } = req.body;

    // Validações
    if (!user_id || !organization_id || !type || !title || !message) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: user_id, organization_id, type, title, message' 
      });
    }

    // Tipos válidos
    const validTypes = [
      'bill_reminder', 'investment_reminder', 'budget_alert', 
      'daily_reminder', 'weekly_report', 'monthly_report', 
      'insight', 'expense_confirmation', 'system_alert'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Tipo inválido. Tipos válidos: ${validTypes.join(', ')}` 
      });
    }

    // Criar notificação
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        organization_id,
        type,
        title,
        message,
        data: data || {},
        priority,
        sent_via: 'inapp'
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
