import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import LoadingLogo from '../../components/LoadingLogo';
import { useOrganization } from '../../hooks/useOrganization';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function EditExpense() {
  const router = useRouter();
  const { id } = router.query;
  const { budgetCategories } = useOrganization();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const paymentMethods = [
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'other', label: 'Outro' }
  ];

  useEffect(() => {
    if (id) {
      fetchExpense();
    }
  }, [id]);

  async function fetchExpense() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          cost_centers(name),
          budget_categories(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setExpense(data);
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      setError('Erro ao carregar despesa');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          amount: parseFloat(expense.amount),
          description: expense.description,
          category: expense.category,
          payment_method: expense.payment_method,
          date: expense.date,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setError('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field, value) {
    setExpense(prev => ({
      ...prev,
      [field]: value
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-fog-mist flex items-center justify-center">
        <LoadingLogo className="h-16 w-16" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-fog-mist flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Despesa não encontrada</p>
          <Button onClick={() => router.push('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Editar Despesa
          </h1>
          <p className="text-gray-600">
            Corrija os dados da despesa para melhorar a precisão dos relatórios
          </p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={expense.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={expense.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Onde foi o gasto"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={expense.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma categoria</option>
                {budgetCategories?.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Método de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pagamento
              </label>
              <select
                value={expense.payment_method || ''}
                onChange={(e) => handleChange('payment_method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um método</option>
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                value={expense.date ? expense.date.split('T')[0] : ''}
                onChange={(e) => handleChange('date', e.target.value + 'T00:00:00Z')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Informações do Sistema */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Informações do Sistema</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Centro de Custo:</strong> {expense.cost_centers?.name || 'N/A'}</p>
                <p><strong>Status:</strong> {expense.status}</p>
                <p><strong>Criado em:</strong> {new Date(expense.created_at).toLocaleString('pt-BR')}</p>
                {expense.updated_at && (
                  <p><strong>Atualizado em:</strong> {new Date(expense.updated_at).toLocaleString('pt-BR')}</p>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex space-x-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
