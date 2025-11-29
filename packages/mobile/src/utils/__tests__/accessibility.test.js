/**
 * Testes para utilitários de Acessibilidade
 */

const { getContrastRatio, meetsWCAGAA, meetsWCAGAAA, getAccessibleTextColor } = require('../accessibility');

describe('Accessibility Utils', () => {
  describe('getContrastRatio', () => {
    it('deve calcular contraste entre branco e preto corretamente', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeGreaterThan(20); // Contraste máximo
    });

    it('deve calcular contraste entre cores similares', () => {
      const ratio = getContrastRatio('#FFFFFF', '#F0F0F0');
      expect(ratio).toBeLessThan(2); // Contraste baixo
    });

    it('deve retornar valor válido para qualquer par de cores', () => {
      const ratio = getContrastRatio('#2563EB', '#FAFAFA');
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(21);
    });
  });

  describe('meetsWCAGAA', () => {
    it('deve retornar true para contraste suficiente (texto normal)', () => {
      expect(meetsWCAGAA('#000000', '#FFFFFF', false)).toBe(true);
    });

    it('deve retornar false para contraste insuficiente', () => {
      expect(meetsWCAGAA('#FFFFFF', '#F0F0F0', false)).toBe(false);
    });

    it('deve usar threshold menor para texto grande', () => {
      const ratio = getContrastRatio('#737373', '#FAFAFA');
      expect(meetsWCAGAA('#737373', '#FAFAFA', true)).toBe(true);
      expect(meetsWCAGAA('#737373', '#FAFAFA', false)).toBe(true); // 4.5:1
    });
  });

  describe('meetsWCAGAAA', () => {
    it('deve retornar true apenas para contraste muito alto', () => {
      expect(meetsWCAGAAA('#000000', '#FFFFFF', false)).toBe(true);
    });

    it('deve retornar false para contraste que atende apenas AA', () => {
      // Contraste que atende AA mas não AAA
      // #737373 em #FAFAFA tem ~4.5:1 - atende AA mas não AAA (precisa 7:1)
      const ratio = getContrastRatio('#737373', '#FAFAFA');
      expect(ratio).toBeLessThan(7);
      expect(meetsWCAGAAA('#737373', '#FAFAFA', false)).toBe(false);
    });
  });

  describe('getAccessibleTextColor', () => {
    it('deve retornar branco para fundo escuro', () => {
      expect(getAccessibleTextColor('#000000')).toBe('#FFFFFF');
    });

    it('deve retornar preto para fundo claro', () => {
      expect(getAccessibleTextColor('#FFFFFF')).toBe('#000000');
    });

    it('deve escolher cor com melhor contraste', () => {
      const color = getAccessibleTextColor('#808080');
      expect(['#FFFFFF', '#000000']).toContain(color);
    });
  });
});
