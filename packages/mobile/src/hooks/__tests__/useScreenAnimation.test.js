/**
 * Testes básicos para useScreenAnimation hook
 * 
 * Nota: Testes de hooks requerem @testing-library/react-hooks
 */

const { useScreenAnimation } = require('../useScreenAnimation');

describe('useScreenAnimation', () => {
  it('deve ser uma função', () => {
    expect(typeof useScreenAnimation).toBe('function');
  });

  // Testes mais completos requerem React Testing Library
  // que precisa ser configurado no projeto
});

