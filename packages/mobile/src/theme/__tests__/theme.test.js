// Testes para verificar exports do tema
const { colors, gradients, shadows, typography, spacing, radius } = require('../index');

describe('Theme Exports', () => {
  it('deve exportar colors como objeto', () => {
    expect(typeof colors).toBe('object');
    expect(colors.brand).toBeDefined();
    expect(colors.brand.primary).toBeDefined();
  });

  it('deve exportar spacing como objeto', () => {
    expect(typeof spacing).toBe('object');
    expect(spacing[2]).toBeDefined();
  });

  it('deve exportar typography como objeto', () => {
    expect(typeof typography).toBe('object');
    expect(typography.sizes).toBeDefined();
  });

  it('deve exportar radius como objeto', () => {
    expect(typeof radius).toBe('object');
  });

  it('deve ter valores válidos', () => {
    expect(colors.brand.primary).toBeTruthy();
    expect(typeof spacing[2]).toBe('number');
  });
});
