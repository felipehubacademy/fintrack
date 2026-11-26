import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X, PiggyBank, CreditCard, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { t } from '@fintrack/shared/i18n';

const GOAL_TYPES = {
  emergency_fund: {
    get label() { return t('web.goalModal.emergencyFund'); },
    icon: PiggyBank,
    color: '#10B981',
    get description() { return t('web.goalModal.n36MonthsOfExpenses'); },
    suggestedAmount: 20000
  },
  debt_payment: {
    get label() { return t('web.goalModal.payOffDebt'); },
    icon: CreditCard,
    color: '#EF4444',
    get description() { return t('web.goalModal.getRidOfDebt'); },
    suggestedAmount: 5000
  },
  purchase: {
    get label() { return t('web.goalModal.plannedPurchase'); },
    icon: ShoppingBag,
    color: '#8B5CF6',
    get description() { return t('web.goalModal.carHomeTrip'); },
    suggestedAmount: 50000
  },
  investment: {
    get label() { return t('web.shared.investing'); },
    icon: TrendingUp,
    color: '#3B82F6',
    get description() { return t('web.goalModal.buildWealth'); },
    suggestedAmount: 100000
  },
  savings: {
    get label() { return t('web.goalModal.generalSavings'); },
    icon: Wallet,
    color: '#F59E0B',
    get description() { return t('web.goalModal.anythingYouWant'); },
    suggestedAmount: 10000
  }
};

export default function GoalModal({ isOpen, onClose, onSave, editingGoal = null }) {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    goal_type: 'savings',
    target_amount: '',
    current_amount: '0',
    monthly_contribution: '',
    target_date: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name || '',
        goal_type: editingGoal.goal_type || 'savings',
        target_amount: editingGoal.target_amount?.toString() || '',
        current_amount: editingGoal.current_amount?.toString() || '0',
        monthly_contribution: editingGoal.monthly_contribution?.toString() || '',
        target_date: editingGoal.target_date || '',
        description: editingGoal.description || ''
      });
    } else {
      setFormData({
        name: '',
        goal_type: 'savings',
        target_amount: '',
        current_amount: '0',
        monthly_contribution: '',
        target_date: '',
        description: ''
      });
    }
  }, [editingGoal, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const goalData = {
        ...formData,
        target_amount: parseFloat(formData.target_amount) || 0,
        current_amount: parseFloat(formData.current_amount) || 0,
        monthly_contribution: parseFloat(formData.monthly_contribution) || 0,
        target_date: formData.target_date || null
      };

      await onSave(goalData);
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      goal_type: type,
      target_amount: prev.target_amount || GOAL_TYPES[type].suggestedAmount.toString()
    }));
  };

  if (!isOpen) return null;

  const selectedType = GOAL_TYPES[formData.goal_type];
  const GoalIcon = selectedType.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">
            {editingGoal ? t('web.goalModal.editGoal') : t('web.goalModal.newGoal')}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conteúdo com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
          <div className="space-y-4 md:space-y-6 mt-4">
            
            {/* Goal Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('web.goalModal.goalType')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(GOAL_TYPES).map(([key, type]) => {
                  const Icon = type.icon;
                  const isSelected = formData.goal_type === key;
                  
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTypeChange(key)}
                      className={`
                        p-4 rounded-lg border-2 transition-all
                        ${isSelected 
                          ? 'border-flight-blue bg-flight-blue/5' 
                          : 'border-gray-300 hover:border-gray-400'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${type.color}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: type.color }} />
                        </div>
                        <span className="text-xs font-medium text-gray-900 text-center">
                          {type.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {selectedType.description}
              </p>
            </div>

            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('web.goalModal.goalName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('web.goalModal.eGEmergencyFundTrip')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                required
              />
            </div>

            {/* Target Amount & Current Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Alvo (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.target_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                    placeholder="0,00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Atual (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
                    placeholder="0,00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('web.goalModal.howMuchHaveYouSaved')}
                </p>
              </div>
            </div>

            {/* Monthly Contribution & Target Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contribuição Mensal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_contribution}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_contribution: e.target.value }))}
                    placeholder="0,00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t('web.goalModal.howMuchWillYouSave')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('web.goalModal.targetDateOptional')}
                </label>
                <input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('web.shared.descriptionOptional')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('web.goalModal.addDetailsAboutYourGoal')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue resize-none"
              />
            </div>

            {/* Projection Preview */}
            {formData.target_amount && formData.monthly_contribution && parseFloat(formData.monthly_contribution) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('web.goalModal.projection')}</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>{t('web.goalModal.stillToSave')}</span>
                    <span className="font-semibold">
                      R$ {(parseFloat(formData.target_amount) - parseFloat(formData.current_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('web.goalModal.estimatedTime')}</span>
                    <span className="font-semibold">
                      {t('web.goalModal.months', { p0: Math.ceil((parseFloat(formData.target_amount) - parseFloat(formData.current_amount || 0)) / parseFloat(formData.monthly_contribution)) })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions - Footer fixo */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {t('web.shared.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.name || !formData.target_amount}
              className="w-full sm:w-auto"
            >
              {saving ? t('web.shared.saving') : editingGoal ? t('web.shared.saveChanges') : t('web.goalModal.createGoal')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
