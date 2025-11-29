/**
 * Testes para utilitários de Haptic Feedback
 * 
 * Nota: Estes testes são básicos pois haptic feedback requer dispositivo físico
 * para testes completos. Focamos em testar a estrutura e lógica.
 */

const { HapticFeedback } = require('../haptics');

// Mock do expo-haptics
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

describe('HapticFeedback', () => {
  it('deve ter todas as funções de feedback definidas', () => {
    expect(HapticFeedback.light).toBeDefined();
    expect(HapticFeedback.medium).toBeDefined();
    expect(HapticFeedback.heavy).toBeDefined();
    expect(HapticFeedback.success).toBeDefined();
    expect(HapticFeedback.warning).toBeDefined();
    expect(HapticFeedback.error).toBeDefined();
    expect(HapticFeedback.selection).toBeDefined();
  });

  it('deve ser possível chamar as funções sem erro', async () => {
    // Não deve lançar erro mesmo sem dispositivo físico
    await expect(HapticFeedback.light()).resolves.not.toThrow();
    await expect(HapticFeedback.medium()).resolves.not.toThrow();
    await expect(HapticFeedback.heavy()).resolves.not.toThrow();
    await expect(HapticFeedback.success()).resolves.not.toThrow();
    await expect(HapticFeedback.warning()).resolves.not.toThrow();
    await expect(HapticFeedback.error()).resolves.not.toThrow();
    await expect(HapticFeedback.selection()).resolves.not.toThrow();
  });
});

