import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useNotifications(userId, organizationId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buscar notificações
  const fetchNotifications = useCallback(async (page = 1, limit = 20) => {
    if (!userId || !organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/notifications/list?user_id=${userId}&organization_id=${organizationId}&page=${page}&limit=${limit}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar notificações');
      }

      setNotifications(data.notifications);
      setUnreadCount(data.notifications.filter(n => !n.read_at).length);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, organizationId]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_id: notificationId,
          user_id: userId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao marcar notificação como lida');
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
      setError(err.message);
    }
  }, [userId]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          organization_id: organizationId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao marcar todas as notificações como lidas');
      }

      // Atualizar estado local
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          read_at: notification.read_at || new Date().toISOString()
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError(err.message);
    }
  }, [userId, organizationId]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const response = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_id: notificationId,
          user_id: userId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar notificação');
      }

      // Atualizar estado local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Verificar se era não lida para atualizar contador
      const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
      setError(err.message);
    }
  }, [userId, notifications]);

  // Criar notificação
  const createNotification = useCallback(async (notificationData) => {
    try {
      const response = await fetch('/api/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notificationData,
          user_id: userId,
          organization_id: organizationId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar notificação');
      }

      // Adicionar à lista local
      setNotifications(prev => [data.notification, ...prev]);
      
      return data.notification;
    } catch (err) {
      console.error('Erro ao criar notificação:', err);
      setError(err.message);
      throw err;
    }
  }, [userId, organizationId]);

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
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Nova notificação recebida:', payload);
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
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
    createNotification
  };
}
