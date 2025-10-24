import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useOrganization } from '../hooks/useOrganization';

export default function BankTransactionModal({ isOpen, onClose, account, organizationId, onSuccess }) {
  const { incomeCategories, budgetCategories } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();
  const [formData, setFormData] = useState({
    transaction_type: 'manual_credit',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: ''
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      transaction_type: 'manual_credit',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: ''
    });
  };

  // Obter categorias baseadas no tipo de transação
  const getCategories = () => {
    if (formData.transaction_type === 'manual_credit') {
      // Para crédito, usar categorias de entrada
      return incomeCategories.map(cat => cat.name);
    } else {
      // Para débito, usar categorias de despesas
      return budgetCategories.map(cat => cat.name);
    }
  };

  const handleChange = (field, value) => {
    // Se mudar o tipo de transação, resetar a categoria
    if (field === 'transaction_type') {
      setFormData(prev => ({ ...prev, [field]: value, category: '' }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description || !formData.date || !formData.category) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (!organizationId) throw new Error('Organização não encontrada');

      // Chamar função RPC para criar transação
      const { data, error } = await supabase.rpc('create_bank_transaction', {
        p_bank_account_id: account.id,
        p_transaction_type: formData.transaction_type,
        p_amount: parseFloat(formData.amount),
        p_description: formData.description,
        p_date: formData.date,
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_expense_id: null,
        p_bill_id: null,
        p_income_id: null,
        p_related_account_id: null
      });

      if (error) throw error;

      resetForm();
      success('Transação criada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      showError('Erro ao criar transação: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[95vh] sm:max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg pr-2">
            Nova Transação
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conteúdo com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          <div className="space-y-4 pt-4">
            {/* Conta Bancária */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta Bancária
              </label>
              <input
                type="text"
                value={account.name}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            {/* Tipo de Transação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Transação *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('transaction_type', 'manual_credit')}
                  className={`p-3 border-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    formData.transaction_type === 'manual_credit'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <ArrowDownCircle className={`h-5 w-5 ${
                    formData.transaction_type === 'manual_credit' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    formData.transaction_type === 'manual_credit' ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    Entrada
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('transaction_type', 'manual_debit')}
                  className={`p-3 border-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    formData.transaction_type === 'manual_debit'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <ArrowUpCircle className={`h-5 w-5 ${
                    formData.transaction_type === 'manual_debit' ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    formData.transaction_type === 'manual_debit' ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    Saída
                  </span>
                </button>
              </div>
            </div>

            {/* Grid para Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {getCategories().map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>

              {/* Descrição - ocupando largura total */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Ex: Salário, Transferência, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer fixo */}
        <div className="flex justify-end space-x-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            {saving ? 'Salvando...' : 'Salvar Transação'}
          </Button>
        </div>
      </div>
    </div>
  );
}

