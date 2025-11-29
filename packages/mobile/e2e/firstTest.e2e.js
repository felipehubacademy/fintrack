/**
 * Testes E2E básicos usando Detox
 * 
 * Nota: Estes testes requerem Detox configurado e dispositivo/emulador rodando
 */

describe('FinTrack E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Login Flow', () => {
    it('deve exibir tela de login inicialmente', async () => {
      await expect(element(by.id('login-screen'))).toBeVisible();
    });

    // Mais testes E2E podem ser adicionados aqui
    // quando Detox estiver completamente configurado
  });

  describe('Navigation', () => {
    it('deve navegar entre tabs', async () => {
      // Exemplo de teste de navegação
      // await element(by.id('transactions-tab')).tap();
      // await expect(element(by.id('transactions-screen'))).toBeVisible();
    });
  });
});

