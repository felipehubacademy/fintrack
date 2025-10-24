import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'bank_transfer', label: 'Transferência' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' }
];

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' }
];

export default function BillModal({ isOpen, onClose, onSave, editingBill = null, costCenters = [], categories = [], cards = [] }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: '',
    category_id: '',
    cost_center_id: '',
    is_shared: false,
    is_recurring: false,
    recurrence_frequency: 'monthly',
    payment_method: '',
    card_id: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingBill) {
      setFormData({
        description: editingBill.description || '',
        amount: editingBill.amount?.toString() || '',
        due_date: editingBill.due_date || '',
        category_id: editingBill.category_id || '',
        cost_center_id: editingBill.cost_center_id || '',
        is_shared: editingBill.is_shared || false,
        is_recurring: editingBill.is_recurring || false,
        recurrence_frequency: editingBill.recurrence_frequency || 'monthly',
        payment_method: editingBill.payment_method || '',
        card_id: editingBill.card_id || ''
      });
    } else {
      resetForm();
    }
  }, [editingBill, isOpen]);

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      due_date: '',
      category_id: '',
      cost_center_id: '',
      is_shared: false,
      is_recurring: false,
      recurrence_frequency: 'monthly',
      payment_method: '',
      card_id: ''
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const billData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        category_id: formData.category_id || null,
        cost_center_id: formData.is_shared ? null : (formData.cost_center_id || null),
        is_shared: formData.is_shared,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
        payment_method: formData.payment_method || null,
        card_id: formData.card_id || null
      };

      await onSave(billData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      setErrors({ submit: 'Erro ao salvar conta. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">
            {editingBill ? 'Editar Conta' : 'Nova Conta a Pagar'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Ex: Aluguel, Conta de Luz..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleChange('amount', e.target.value)}
                      placeholder="0.00"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                        errors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleChange('due_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                      errors.due_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.due_date && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.due_date}
                    </p>
                  )}
                </div>
              </div>

              {/* Categoria e Centro de Custo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsável
                  </label>
                  <div className="space-y-2">
                    <select
                      value={formData.is_shared ? 'shared' : formData.cost_center_id}
                      onChange={(e) => {
                        if (e.target.value === 'shared') {
                          handleChange('is_shared', true);
                          handleChange('cost_center_id', '');
                        } else {
                          handleChange('is_shared', false);
                          handleChange('cost_center_id', e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    >
                      <option value="">Selecione...</option>
                      <option value="shared">Compartilhado</option>
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                      ))}
                    </select>
                    
                    {formData.is_shared && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-700">
                            <p className="font-medium">Conta Compartilhada</p>
                            <p className="text-blue-600 mt-1">
                              Esta conta será dividida entre todos os responsáveis financeiros conforme suas porcentagens padrão.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recorrência */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => handleChange('is_recurring', e.target.checked)}
                    className="rounded border-gray-300 text-flight-blue focus:ring-flight-blue"
                  />
                  <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">
                    Conta Recorrente
                  </label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequência
                    </label>
                    <select
                      value={formData.recurrence_frequency}
                      onChange={(e) => handleChange('recurrence_frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      A próxima conta será criada automaticamente após o pagamento
                    </p>
                  </div>
                )}
              </div>

              {/* Método de Pagamento (Opcional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pagamento (Opcional)
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => handleChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                {formData.payment_method === 'credit_card' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cartão
                    </label>
                    <select
                      value={formData.card_id}
                      onChange={(e) => handleChange('card_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    >
                      <option value="">Selecione...</option>
                      {cards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.name} - {card.bank}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {errors.submit}
                  </p>
                </div>
              )}

            </form>
        </div>
        
        {/* Footer fixo */}
        <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            {loading ? 'Salvando...' : editingBill ? 'Atualizar' : 'Criar Conta'}
          </Button>
        </div>
      </div>
    </div>
  );
}

