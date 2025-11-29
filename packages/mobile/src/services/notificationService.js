/**
 * Notification Service
 * 
 * Este serviço gerencia notificações push no app mobile.
 * 
 * SETUP NECESSÁRIO:
 * 1. Instalar: npx expo install expo-notifications expo-device expo-constants
 * 2. Configurar app.json com notificações
 * 3. Configurar backend para enviar push notifications
 * 
 * FUNCIONALIDADES:
 * - Solicitar permissões
 * - Registrar token de push
 * - Agendar notificações locais
 * - Lidar com notificações recebidas
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configurar como as notificações devem ser exibidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Solicita permissão para notificações e registra o token
   */
  async registerForPushNotifications(userId) {
    console.log('🔔 Iniciando registro de notificações...');
    
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications não funcionam no simulator');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permissão de notificação negada');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId,
      });
      const token = tokenData.data;

    this.expoPushToken = token;

    // Salvar token no backend
    if (userId) {
      await this.saveTokenToBackend(userId, token);
    }

    // Configurar listeners
    this.setupListeners();

    console.log('✅ Token de push registrado:', token);
    return token;
    } catch (error) {
      console.error('❌ Erro ao obter token de push:', error);
    return null;
    }
  }

  /**
   * Salva o token no Supabase para o backend poder enviar notificações
   */
  async saveTokenToBackend(userId, token) {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;
      console.log('✅ Token salvo no backend');
    } catch (error) {
      console.error('❌ Erro ao salvar token:', error);
    }
  }

  /**
   * Configura listeners para notificações
   */
  setupListeners() {
    // Listener para notificações recebidas quando o app está aberto
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notificação recebida:', notification);
      // Você pode atualizar o estado do app aqui
    });

    // Listener para quando o usuário interage com a notificação
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notificação tocada:', response);
      // Navegar para a tela relevante
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  }

  /**
   * Lida com o tap em uma notificação
   */
  handleNotificationTap(data) {
    console.log('📱 Tratando tap na notificação:', data);
    // TODO: Implementar navegação baseada no tipo de notificação
    // Exemplo:
    // if (data.type === 'bill_due') {
    //   navigation.navigate('Bills');
    // } else if (data.type === 'budget_alert') {
    //   navigation.navigate('Budgets');
    // }
  }

  /**
   * Agenda uma notificação local
   */
  async scheduleLocalNotification({ title, body, data, trigger }) {
    try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });

    console.log('✅ Notificação agendada:', id);
    return id;
    } catch (error) {
      console.error('❌ Erro ao agendar notificação:', error);
    return null;
    }
  }

  /**
   * Cancela uma notificação agendada
   */
  async cancelScheduledNotification(notificationId) {
    try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('✅ Notificação cancelada:', notificationId);
    } catch (error) {
      console.error('❌ Erro ao cancelar notificação:', error);
    }
  }

  /**
   * Cancela todas as notificações agendadas
   */
  async cancelAllScheduledNotifications() {
    try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Todas as notificações canceladas');
    } catch (error) {
      console.error('❌ Erro ao cancelar todas as notificações:', error);
    }
  }

  /**
   * Limpa listeners quando o componente é desmontado
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * HELPER: Agenda notificação de vencimento de conta
   */
  async scheduleBillDueNotification(bill, daysBefore = 3) {
    const dueDate = new Date(bill.due_date);
    const notificationDate = new Date(dueDate);
    notificationDate.setDate(notificationDate.getDate() - daysBefore);

    const now = new Date();
    if (notificationDate > now) {
      return await this.scheduleLocalNotification({
        title: 'Conta a vencer',
        body: `${bill.description} vence em ${daysBefore} dias (${formatCurrency(bill.amount)})`,
        data: { type: 'bill_due', billId: bill.id },
        trigger: { date: notificationDate },
      });
    }

    return null;
  }

  /**
   * HELPER: Agenda notificação de orçamento excedido
   */
  async scheduleBudgetAlertNotification(category, spent, budget) {
    const percentage = (spent / budget) * 100;

    if (percentage >= 80) {
      return await this.scheduleLocalNotification({
        title: 'Alerta de Orçamento',
        body: `Você já gastou ${percentage.toFixed(0)}% do orçamento de ${category}`,
        data: { type: 'budget_alert', category },
        trigger: null, // Enviar imediatamente
      });
    }

    return null;
  }
}

// Exportar instância única
export const notificationService = new NotificationService();

// Helper para formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

