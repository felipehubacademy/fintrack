import { useState } from 'react';
import { Button } from '../ui/Button';
import { X, Plus, TrendingUp } from 'lucide-react';

export default function ContributionModal({ isOpen, onClose, onSave, goal }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await onSave({
        goal_id: goal.id,
        amount: parseFloat(amount),
        contribution_date: date,
        notes: notes || null
      });
      
      // Reset form
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error saving contribution:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !goal) return null;

  const newTotal = parseFloat(goal.current_amount || 0) + parseFloat(amount || 0);
  const newProgress = (newTotal / parseFloat(goal.target_amount)) * 100;
  const remaining = parseFloat(goal.target_amount) - newTotal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg border border-flight-blue/20 flex flex-col max-h-[90vh] sm:max-h-[95vh]">
        
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">
              Adicionar Contribuição
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {goal.name}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Status */}
        <div className="px-4 sm:px-5 md:px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Valor Atual:</span>
              <div className="font-semibold text-gray-900 mt-1">
                R$ {parseFloat(goal.current_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Meta:</span>
              <div className="font-semibold text-gray-900 mt-1">
                R$ {parseFloat(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progresso</span>
              <span>{((parseFloat(goal.current_amount || 0) / parseFloat(goal.target_amount)) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-flight-blue h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((parseFloat(goal.current_amount || 0) / parseFloat(goal.target_amount)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form - Conteúdo com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-4">
          <div className="space-y-4 md:space-y-6">
            
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor da Contribuição (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Contribuição *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Bônus do trabalho, economia do mês, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue resize-none"
              />
            </div>

            {/* Preview */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Após esta contribuição:</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novo total:</span>
                    <span className="font-semibold text-gray-900">
                      R$ {newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novo progresso:</span>
                    <span className="font-semibold text-green-600">
                      {newProgress.toFixed(1)}%
                    </span>
                  </div>
                  {remaining > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Faltam:</span>
                      <span className="font-semibold text-gray-900">
                        R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center pt-2 border-t border-green-300">
                      <span className="text-green-700 font-bold">🎉 Meta atingida!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions - Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !amount || parseFloat(amount) <= 0}
              className="w-full sm:w-auto"
            >
              {saving ? 'Salvando...' : 'Adicionar Contribuição'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
