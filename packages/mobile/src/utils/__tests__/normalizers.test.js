/**
 * Testes para normalizadores de dados
 */

const { normalizeExpense, normalizeIncome, sumAmounts } = require('../normalizers');

describe('Normalizers', () => {
  describe('normalizeExpense', () => {
    it('deve normalizar expense básico', () => {
      const expense = {
        id: 1,
        amount: 100.50,
        date: '2024-01-15',
        description: 'Test',
      };

      const normalized = normalizeExpense(expense);
      expect(normalized).toHaveProperty('id', 1);
      expect(normalized).toHaveProperty('amount', 100.50);
      expect(normalized).toHaveProperty('type', 'expense');
      expect(normalized).toHaveProperty('description', 'Test');
    });

    it('deve lidar com valores nulos', () => {
      const expense = {
        id: 1,
        amount: null,
        date: null,
      };

      const normalized = normalizeExpense(expense);
      expect(normalized).toBeDefined();
      expect(normalized.amount).toBe(0);
    });

    it('deve normalizar category corretamente', () => {
      const expense = {
        id: 1,
        amount: 100,
        category: { id: 1, name: 'Food' },
      };

      const normalized = normalizeExpense(expense);
      expect(normalized.category_name).toBe('Food');
      expect(normalized.category_id).toBe(1);
    });
  });

  describe('normalizeIncome', () => {
    it('deve normalizar income básico', () => {
      const income = {
        id: 1,
        amount: 500.00,
        date: '2024-01-15',
        description: 'Salary',
      };

      const normalized = normalizeIncome(income);
      expect(normalized).toHaveProperty('id', 1);
      expect(normalized).toHaveProperty('amount', 500.00);
      expect(normalized).toHaveProperty('type', 'income');
    });

    it('deve lidar com valores nulos', () => {
      const income = {
        id: 1,
        amount: null,
      };

      const normalized = normalizeIncome(income);
      expect(normalized).toBeDefined();
      expect(normalized.amount).toBe(0);
    });
  });

  describe('sumAmounts', () => {
    it('deve somar valores corretamente', () => {
      const items = [
        { amount: 100 },
        { amount: 200 },
        { amount: 50 },
      ];

      expect(sumAmounts(items)).toBe(350);
    });

    it('deve lidar com array vazio', () => {
      expect(sumAmounts([])).toBe(0);
    });

    it('deve lidar com valores nulos/undefined', () => {
      const items = [
        { amount: 100 },
        { amount: null },
        { amount: undefined },
      ];

      expect(sumAmounts(items)).toBe(100);
    });
  });
});

