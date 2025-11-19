import { useState, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { Button } from './ui/Button';
import { formatCurrencyInput, parseCurrencyInput } from '../lib/utils';

const INVESTMENT_TYPES = [
  { value: 'stocks', label: 'Ações', icon: '📈' },
  { value: 'funds', label: 'Fundos de Investimento', icon: '💼' },
  { value: 'treasury', label: 'Tesouro Direto', icon: '🏛️' },
  { value: 'fixed_income', label: 'Renda Fixa (CDB, LCI, LCA)', icon: '📊' },
  { value: 'crypto', label: 'Criptomoedas', icon: '₿' },
  { value: 'other', label: 'Outros', icon: '💰' }
];

export default function InvestmentModal({ isOpen, onClose, onSave, investment = null, goals = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'stocks',
    broker: '',
    invested_amount: '',
    current_value: '',
    quantity: '',
    purchase_date: new Date().toISOString().split('T')[0],
    goal_id: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (investment) {
      setFormData({
        name: investment.name || '',
        type: investment.type || 'stocks',
        broker: investment.broker || '',
        invested_amount: investment.invested_amount ? formatCurrencyInput(investment.invested_amount) : '',
        current_value: investment.current_value ? formatCurrencyInput(investment.current_value) : '',
        quantity: investment.quantity || '',
        purchase_date: investment.purchase_date || new Date().toISOString().split('T')[0],
        goal_id: investment.goal_id || '',
        notes: investment.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'stocks',
        broker: '',
        invested_amount: '',
        current_value: '',
        quantity: '',
        purchase_date: new Date().toISOString().split('T')[0],
        goal_id: '',
        notes: ''
      });
    }
    setErrors({});
  }, [investment, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome/Código é obrigatório';
    }

    if (!formData.invested_amount) {
      newErrors.invested_amount = 'Valor investido é obrigatório';
    } else {
      const amount = parseCurrencyInput(formData.invested_amount);
      if (amount <= 0) {
        newErrors.invested_amount = 'Valor deve ser maior que zero';
      }
    }

    if (!formData.purchase_date) {
      newErrors.purchase_date = 'Data da compra é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        broker: formData.broker.trim() || null,
        invested_amount: parseCurrencyInput(formData.invested_amount),
        current_value: formData.current_value ? parseCurrencyInput(formData.current_value) : null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        purchase_date: formData.purchase_date,
        goal_id: formData.goal_id || null,
        notes: formData.notes.trim() || null,
        last_updated_at: formData.current_value ? new Date().toISOString() : null
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCurrencyChange = (field, value) => {
    // Remove tudo exceto números e vírgula
    const cleaned = value.replace(/[^\d,]/g, '');
    setFormData(prev => ({ ...prev, [field]: cleaned }));
  };

  const handleCurrencyBlur = (field) => {
    const value = formData[field];
    if (value) {
      const parsed = parseCurrencyInput(value);
      setFormData(prev => ({ ...prev, [field]: formatCurrencyInput(parsed) }));
    }
  };

  if (!isOpen) return null;

  const isFormValid = formData.name.trim() && formData.invested_amount && formData.purchase_date;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {investment ? 'Editar Investimento' : 'Novo Investimento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form com scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="investment-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Investimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Investimento *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {INVESTMENT_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.type === type.value
                        ? 'border-flight-blue bg-flight-blue/5 text-flight-blue'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="text-xl mb-1 block">{type.icon}</span>
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nome/Código */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome/Código do Investimento *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: PETR4, Tesouro Selic 2027, Bitcoin"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Corretora/Banco */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Corretora/Banco
              </label>
              <input
                type="text"
                value={formData.broker}
                onChange={(e) => setFormData(prev => ({ ...prev, broker: e.target.value }))}
                placeholder="Ex: XP Investimentos, Nubank, Rico"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Valor Investido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Investido *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={formData.invested_amount}
                    onChange={(e) => handleCurrencyChange('invested_amount', e.target.value)}
                    onBlur={() => handleCurrencyBlur('invested_amount')}
                    placeholder="0,00"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                      errors.invested_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.invested_amount && <p className="text-red-500 text-sm mt-1">{errors.invested_amount}</p>}
              </div>

              {/* Valor Atual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Atual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={formData.current_value}
                    onChange={(e) => handleCurrencyChange('current_value', e.target.value)}
                    onBlur={() => handleCurrencyBlur('current_value')}
                    placeholder="0,00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Deixe em branco se não souber</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade (cotas/ações)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
              </div>

              {/* Data da Compra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data da Compra *
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.purchase_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.purchase_date && <p className="text-red-500 text-sm mt-1">{errors.purchase_date}</p>}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionais sobre este investimento..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid}
            className="bg-flight-blue hover:bg-flight-blue/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Salvando...' : investment ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
