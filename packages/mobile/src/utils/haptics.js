import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Utilitários para haptic feedback
 * 
 * Tipos disponíveis:
 * - light: Feedback leve (para ações simples)
 * - medium: Feedback médio (para ações importantes)
 * - heavy: Feedback forte (para ações críticas)
 * - success: Feedback de sucesso
 * - warning: Feedback de aviso
 * - error: Feedback de erro
 * - selection: Feedback de seleção (para pickers, switches)
 */

export const HapticFeedback = {
  /**
   * Feedback leve - para ações simples como toques em botões
   */
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },

  /**
   * Feedback médio - para ações importantes
   */
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },

  /**
   * Feedback forte - para ações críticas
   */
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },

  /**
   * Feedback de sucesso - para ações bem-sucedidas
   */
  success: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },

  /**
   * Feedback de aviso - para avisos
   */
  warning: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },

  /**
   * Feedback de erro - para erros
   */
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },

  /**
   * Feedback de seleção - para pickers, switches, etc
   */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      // Haptics não disponível, ignorar silenciosamente
    }
  },
};

