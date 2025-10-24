import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, AlertCircle, Target, Calendar } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensal', daysLabel: 'Dia do mês' },
  { value: 'biweekly', label: 'Quinzenal', daysLabel: 'Dias do mês (2 datas)' },
  { value: 'weekly', label: 'Semanal', daysLabel: 'Dia da semana' }
];

export default function InvestmentGoalModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingGoal = null,
  costCenters = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    frequency: 'monthly',
    due_day: '',
    cost_center_id: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name || '',
        target_amount: editingGoal.target_amount?.toString() || '',
        frequency: editingGoal.frequency || 'monthly',
        due_day: editingGoal.due_day?.toString() || '',
        cost_center_id: editingGoal.cost_center_id || ''
      });
    } else {
      resetForm();
    }
  }, [editingGoal, isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      target_amount: '',
      frequency: 'monthly',
      due_day: '',
      cost_center_id: ''
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da meta é obrigatório';
    }

    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = 'Valor da meta deve ser maior que zero';
    }

    if (!formData.due_day) {
      newErrors.due_day = 'Dia de lembrete é obrigatório';
    } else {
      const day = parseInt(formData.due_day);
      if (formData.frequency === 'monthly' && (day < 1 || day > 31)) {
        newErrors.due_day = 'Dia deve estar entre 1 e 31';
      } else if (formData.frequency === 'weekly' && (day < 0 || day > 6)) {
        newErrors.due_day = 'Dia deve estar entre 0 (Domingo) e 6 (Sábado)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const goalData = {
        name: formData.name.trim(),
        target_amount: parseFloat(formData.target_amount),
        frequency: formData.frequency,
        due_day: parseInt(formData.due_day),
        cost_center_id: formData.cost_center_id || null,
        is_active: true
      };

      await onSave(goalData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      setErrors({ submit: 'Erro ao salvar meta. Tente novamente.' });
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

  const getDayLabel = () => {
    if (formData.frequency === 'weekly') {
      return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][parseInt(formData.due_day)] || '';
    }
    return formData.due_day;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg flex items-center space-x-2">
            <Target className="h-5 w-5 text-flight-blue" />
            <span>{editingGoal ? 'Editar Meta' : 'Nova Meta de Investimento'}</span>
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome da Meta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Meta *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Reserva de Emergência, Investir em Ações..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Valor da Meta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Meta (por período) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.target_amount}
                    onChange={(e) => handleChange('target_amount', e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                      errors.target_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.target_amount && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.target_amount}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Meta de investimento por período (mensal, quinzenal ou semanal)
                </p>
              </div>

              {/* Frequência */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequência de Aporte *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {FREQUENCY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('frequency', option.value)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.frequency === option.value
                          ? 'border-flight-blue bg-flight-blue/5 text-flight-blue'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dia de Lembrete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.frequency === 'monthly' && 'Dia do Mês (1-31) *'}
                  {formData.frequency === 'biweekly' && 'Dias do Mês (Ex: 5,20) *'}
                  {formData.frequency === 'weekly' && 'Dia da Semana (0=Dom, 6=Sab) *'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type={formData.frequency === 'biweekly' ? 'text' : 'number'}
                    min={formData.frequency === 'weekly' ? '0' : '1'}
                    max={formData.frequency === 'weekly' ? '6' : '31'}
                    value={formData.due_day}
                    onChange={(e) => handleChange('due_day', e.target.value)}
                    placeholder={
                      formData.frequency === 'monthly' ? 'Ex: 5, 15, 30...' :
                      formData.frequency === 'biweekly' ? 'Ex: 5,20' :
                      'Ex: 0 (Domingo), 1 (Segunda)...'
                    }
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                      errors.due_day ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.due_day && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.due_day}
                  </p>
                )}
                {formData.frequency === 'monthly' && formData.due_day && (
                  <p className="mt-1 text-xs text-gray-500">
                    Você receberá lembretes todo dia {formData.due_day} do mês
                  </p>
                )}
                {formData.frequency === 'weekly' && formData.due_day && (
                  <p className="mt-1 text-xs text-gray-500">
                    Você receberá lembretes toda {getDayLabel()}
                  </p>
                )}
              </div>

              {/* Centro de Custo (Opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsável (Opcional)
                </label>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => handleChange('cost_center_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="">Selecione...</option>
                  {costCenters.filter(cc => cc.is_active !== false).map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Vincule esta meta a um responsável específico (opcional)
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Target className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium text-gray-900 mb-1">Como funciona?</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Você receberá lembretes automáticos no dia configurado</li>
                      <li>• Registre seus aportes para acompanhar o progresso</li>
                      <li>• Visualize quanto já investiu e quanto falta para a meta</li>
                    </ul>
                  </div>
                </div>
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
            {loading ? 'Salvando...' : editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
          </Button>
        </div>
      </div>
    </div>
  );
}

