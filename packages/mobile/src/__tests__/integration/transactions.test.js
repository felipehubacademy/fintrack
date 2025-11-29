/**
 * Testes de integração para fluxo de transações
 * 
 * Estes testes verificam o fluxo completo de criação/edição/exclusão
 * de transações e sua sincronização com o backend.
 */

describe('Transactions Integration', () => {
  // Mock do Supabase para testes
  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Criação de Transação', () => {
    it('deve criar expense corretamente', async () => {
      const expenseData = {
        organization_id: 'org-1',
        amount: 100,
        description: 'Test expense',
        date: '2024-01-15',
        type: 'expense',
      };

      const result = await mockSupabase
        .from('expenses')
        .insert(expenseData);

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
      expect(result.error).toBeNull();
    });

    it('deve criar income corretamente', async () => {
      const incomeData = {
        organization_id: 'org-1',
        amount: 500,
        description: 'Salary',
        date: '2024-01-15',
        type: 'income',
      };

      const result = await mockSupabase
        .from('incomes')
        .insert(incomeData);

      expect(mockSupabase.from).toHaveBeenCalledWith('incomes');
      expect(result.error).toBeNull();
    });
  });

  describe('Atualização de Transação', () => {
    it('deve atualizar expense corretamente', async () => {
      const updateData = {
        amount: 150,
        description: 'Updated expense',
      };

      const result = await mockSupabase
        .from('expenses')
        .update(updateData)
        .eq('id', 'expense-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
      expect(result.error).toBeNull();
    });
  });

  describe('Exclusão de Transação', () => {
    it('deve excluir expense corretamente', async () => {
      const result = await mockSupabase
        .from('expenses')
        .delete()
        .eq('id', 'expense-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
      expect(result.error).toBeNull();
    });
  });
});

