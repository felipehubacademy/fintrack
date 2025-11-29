import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

export function useInAppNotifications(userId, organizationId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar notificações
  const fetchNotifications = useCallback(async () => {
    if (!userId || !organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.read_at).length);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId]);

  // Marcar como lida
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (updateError) throw updateError;

        // Atualizar estado local
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read_at: new Date().toISOString() }
              : notification
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
        setError(err.message);
      }
    },
    [userId]
  );

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .is('read_at', null);

      if (updateError) throw updateError;

      // Atualizar estado local
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError(err.message);
    }
  }, [userId, organizationId]);

  // Deletar notificação
  const deleteNotification = useCallback(
    async (notificationId) => {
      try {
        const wasUnread = notifications.find((n) => n.id === notificationId && !n.read_at);

        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Atualizar estado local
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // Verificar se era não lida para atualizar contador
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error('Erro ao deletar notificação:', err);
        setError(err.message);
      }
    },
    [userId, notifications]
  );

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!userId || !organizationId) return;

    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [fetchNotifications, userId, organizationId]);

  // Real-time subscription para novas notificações
  useEffect(() => {
    if (!userId || !organizationId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Nova notificação recebida:', payload);
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, organizationId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

