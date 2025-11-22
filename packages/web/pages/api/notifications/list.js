/**
 * API: List Notifications
 * Listar notificações do usuário com paginação
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validar variáveis de ambiente
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente faltando:', {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar configuração do Supabase
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ API notifications/list: Supabase não configurado');
    return res.status(500).json({
      success: false,
      error: 'Configuração do Supabase incompleta',
      details: {
        url: !!supabaseUrl,
        key: !!supabaseServiceKey
      }
    });
  }

  try {
    const { user_id, organization_id, page = 1, limit = 20, type, unread_only = false } = req.query;

    if (!user_id || !organization_id) {
      return res.status(400).json({ 
        error: 'user_id e organization_id são obrigatórios' 
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Filtros
    if (type) {
      query = query.eq('type', type);
    }

    if (unread_only === 'true') {
      query = query.is('read_at', null);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Contar total para paginação
    let countQuery = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('organization_id', organization_id);

    if (type) {
      countQuery = countQuery.eq('type', type);
    }

    if (unread_only === 'true') {
      countQuery = countQuery.is('read_at', null);
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    // Agrupar por data
    const groupedNotifications = {};
    notifications.forEach(notification => {
      const date = new Date(notification.created_at).toLocaleDateString('pt-BR');
      if (!groupedNotifications[date]) {
        groupedNotifications[date] = [];
      }
      groupedNotifications[date].push(notification);
    });

    return res.status(200).json({
      success: true,
      notifications,
      grouped: groupedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
