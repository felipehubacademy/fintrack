import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, AlertCircle, DollarSign, Users, User } from 'lucide-react';

const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Vendas',
  'Aluguel',
  'Bonificação',
  'Outros'
];

export default function IncomeModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingIncome = null, 
  costCenters = [] 
}) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    is_shared: false,
    cost_center_id: ''
  });
  
  const [splitDetails, setSplitDetails] = useState([]);
  const [showSplitConfig, setShowSplitConfig] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingIncome) {
      setFormData({
        description: editingIncome.description || '',
        amount: editingIncome.amount?.toString() || '',
        date: editingIncome.date || new Date().toISOString().split('T')[0],
        category: editingIncome.category || '',
        is_shared: editingIncome.is_shared || false,
        cost_center_id: editingIncome.cost_center_id || ''
      });
      
      if (editingIncome.income_splits) {
        setSplitDetails(editingIncome.income_splits);
        setShowSplitConfig(true);
      }
    } else {
      resetForm();
    }
  }, [editingIncome, isOpen]);

  // Inicializar splits quando compartilhado for selecionado
  useEffect(() => {
    if (formData.is_shared && splitDetails.length === 0) {
      const activeCenters = costCenters.filter(cc => cc.is_active !== false);
      const defaultSplits = activeCenters.map(cc => ({
        cost_center_id: cc.id,
        name: cc.name,
        color: cc.color,
        percentage: parseFloat(cc.default_split_percentage || 0),
        amount: 0
      }));
      setSplitDetails(defaultSplits);
    } else if (!formData.is_shared) {
      setSplitDetails([]);
      setShowSplitConfig(false);
    }
  }, [formData.is_shared, costCenters]);

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      is_shared: false,
      cost_center_id: ''
    });
    setSplitDetails([]);
    setShowSplitConfig(false);
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

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }

    if (!formData.is_shared && !formData.cost_center_id) {
      newErrors.cost_center_id = 'Selecione um responsável';
    }

    if (formData.is_shared) {
      const totalPercentage = splitDetails.reduce((sum, split) => sum + parseFloat(split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        newErrors.splits = `A soma dos percentuais deve ser 100% (atual: ${totalPercentage.toFixed(1)}%)`;
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
      const incomeData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category || null,
        is_shared: formData.is_shared,
        cost_center_id: formData.is_shared ? null : formData.cost_center_id,
        splits: formData.is_shared ? splitDetails.map(split => ({
          cost_center_id: split.cost_center_id,
          percentage: parseFloat(split.percentage),
          amount: parseFloat(formData.amount) * parseFloat(split.percentage) / 100
        })) : null
      };

      await onSave(incomeData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar entrada:', error);
      setErrors({ submit: 'Erro ao salvar entrada. Tente novamente.' });
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

  const handleSplitChange = (index, percentage) => {
    const newSplits = [...splitDetails];
    newSplits[index].percentage = percentage;
    
    // Recalcular valores
    const totalAmount = parseFloat(formData.amount) || 0;
    newSplits[index].amount = (totalAmount * percentage / 100).toFixed(2);
    
    setSplitDetails(newSplits);
    
    if (errors.splits) {
      setErrors(prev => ({ ...prev, splits: '' }));
    }
  };

  const getTotalPercentage = () => {
    return splitDetails.reduce((sum, split) => sum + parseFloat(split.percentage || 0), 0);
  };

  if (!isOpen) return null;

  const totalPercentage = getTotalPercentage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">
            {editingIncome ? 'Editar Entrada' : 'Nova Entrada Financeira'}
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
                  placeholder="Ex: Salário, Freelance, Venda..."
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
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.date}
                    </p>
                  )}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="">Selecione...</option>
                  {INCOME_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Entrada */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Entrada
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('is_shared', false)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !formData.is_shared
                        ? 'border-flight-blue bg-flight-blue/5'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2 text-flight-blue" />
                    <div className="text-sm font-medium">Individual</div>
                    <div className="text-xs text-gray-500 mt-1">100% para um responsável</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('is_shared', true)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.is_shared
                        ? 'border-flight-blue bg-flight-blue/5'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-2 text-flight-blue" />
                    <div className="text-sm font-medium">Compartilhada</div>
                    <div className="text-xs text-gray-500 mt-1">Dividir entre responsáveis</div>
                  </button>
                </div>

                {/* Seleção Individual */}
                {!formData.is_shared && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Responsável *
                    </label>
                    <select
                      value={formData.cost_center_id}
                      onChange={(e) => handleChange('cost_center_id', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                        errors.cost_center_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Selecione...</option>
                      {costCenters.filter(cc => cc.is_active !== false).map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                      ))}
                    </select>
                    {errors.cost_center_id && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.cost_center_id}
                      </p>
                    )}
                  </div>
                )}

                {/* Divisão Compartilhada */}
                {formData.is_shared && splitDetails.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Divisão entre Responsáveis
                      </label>
                      <span className={`text-sm font-medium ${
                        Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        Total: {totalPercentage.toFixed(1)}%
                      </span>
                    </div>

                    {splitDetails.map((split, index) => (
                      <div key={split.cost_center_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: split.color || '#6B7280' }}
                        />
                        <span className="flex-1 text-sm font-medium text-gray-900">
                          {split.name}
                        </span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={split.percentage}
                            onChange={(e) => handleSplitChange(index, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          />
                          <span className="text-sm text-gray-500">%</span>
                          <span className="text-sm text-gray-600 w-24 text-right">
                            R$ {split.amount || '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}

                    {errors.splits && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.splits}
                      </p>
                    )}
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

              {/* Botões */}
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
            {loading ? 'Salvando...' : editingIncome ? 'Atualizar' : 'Registrar Entrada'}
          </Button>
        </div>
      </div>
    </div>
  );
}

