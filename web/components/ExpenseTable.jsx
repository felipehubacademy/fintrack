import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ExpenseTable({ expenses, loading, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editOwner, setEditOwner] = useState('');
  const [saving, setSaving] = useState(false);
  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      ignored: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      confirmed: 'Confirmado',
      pending: 'Pendente',
      ignored: 'Ignorado'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getOwnerBadge = (owner) => {
    const styles = {
      'Felipe': 'bg-blue-100 text-blue-800',
      'Leticia': 'bg-pink-100 text-pink-800',
      'Compartilhado': 'bg-purple-100 text-purple-800'
    };

    if (!owner) return <span className="text-gray-400 text-sm">-</span>;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[owner] || 'bg-gray-100 text-gray-800'}`}>
        {owner}
      </span>
    );
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditOwner(expense.owner || '');
  };

  const handleSave = async () => {
    if (!editOwner) {
      alert('Selecione um responsável');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          owner: editOwner,
          status: 'confirmed',
          split: editOwner === 'Compartilhado',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      // Fechar modal
      setEditingId(null);
      setEditOwner('');

      // Atualizar lista
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar despesa');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditOwner('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando despesas...</p>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-600">Nenhuma despesa encontrada</p>
          <p className="text-sm text-gray-500 mt-1">Faça uma compra para começar!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Despesas</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Responsável
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(expense.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={expense.description}>
                    {expense.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {expense.category || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getOwnerBadge(expense.owner)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  R$ {parseFloat(expense.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(expense.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-purple-600 hover:text-purple-900 font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Responsável</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsável
              </label>
              <select
                value={editOwner}
                onChange={(e) => setEditOwner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="Felipe">Felipe</option>
                <option value="Leticia">Letícia</option>
                <option value="Compartilhado">Compartilhado</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
