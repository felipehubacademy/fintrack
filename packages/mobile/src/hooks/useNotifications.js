import { useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';

/**
 * Hook para gerenciar notificações push
 * 
 * SETUP NECESSÁRIO:
 * 1. Instalar expo-notifications (ver notificationService.js)
 * 2. Descomentar código no serviço
 * 
 * USO:
 * const { token, registerNotifications, scheduleNotification } = useNotifications(user?.id);
 */
export function useNotifications(userId) {
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      registerNotifications();
    }

    // Cleanup listeners ao desmontar
    return () => {
      notificationService.cleanup();
    };
  }, [userId]);

  const registerNotifications = async () => {
    try {
      const pushToken = await notificationService.registerForPushNotifications(userId);
      setToken(pushToken);
    } catch (err) {
      console.error('Erro ao registrar notificações:', err);
      setError(err);
    }
  };

  const scheduleNotification = async (notificationData) => {
    try {
      const id = await notificationService.scheduleLocalNotification(notificationData);
      return id;
    } catch (err) {
      console.error('Erro ao agendar notificação:', err);
      setError(err);
      return null;
    }
  };

  const cancelNotification = async (notificationId) => {
    try {
      await notificationService.cancelScheduledNotification(notificationId);
    } catch (err) {
      console.error('Erro ao cancelar notificação:', err);
      setError(err);
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await notificationService.cancelAllScheduledNotifications();
    } catch (err) {
      console.error('Erro ao cancelar todas as notificações:', err);
      setError(err);
    }
  };

  return {
    token,
    error,
    registerNotifications,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
  };
}

