import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { useNotificationContext } from '../contexts/NotificationContext';
import { handleCurrencyChange, parseCurrencyInput, formatCurrencyInput } from '../lib/utils';

const BudgetModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  budget = null, 
  categories = [], 
  selectedMonth = '2025-10' 
  }) => {
  const { warning } = useNotificationContext();
  
  const [formData, setFormData] = useState({
    category_id: '',
    limit_amount: '',
    category_name: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Limpar formulário quando o modal fecha
    if (!isOpen) {
      setFormData({
        category_id: '',
        limit_amount: '',
        category_name: ''
      });
      return;
    }

    // Preencher formulário quando o modal abre
    if (budget && budget.id) {
      // Modo edição: preencher com dados do budget
      setFormData({
        category_id: budget.category_id || '',
        limit_amount: budget.amount ? formatCurrencyInput(budget.amount) : '',
        category_name: budget.category || budget.category_name || ''
      });
    } else {
      // Modo criação: formulário vazio
      setFormData({
        category_id: '',
        limit_amount: '',
        category_name: ''
      });
    }
  }, [budget, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.limit_amount) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      // Se for edição, incluir o id do budget
      const budgetData = {
        ...formData,
        category_name: categories.find(c => c.id === formData.category_id)?.name || formData.category_name
      };
      
      // Se budget existe e tem id, incluir no budgetData para edição
      if (budget && budget.id) {
        budgetData.id = budget.id;
      }
      
      await onSave(budgetData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Verificar se é modo edição: budget deve existir E ter um id válido
  const isEdit = !!(budget && budget.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl pr-2">
            {isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                disabled={isEdit}
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                required
              >
                <option value="">Selecione uma categoria...</option>
                {[...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">
                  A categoria não pode ser alterada. Para mudar, exclua e crie um novo orçamento.
                </p>
              )}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Orçamento (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="text"
                  value={formData.limit_amount}
                  onChange={(e) => handleCurrencyChange(e, (value) => setFormData({ ...formData, limit_amount: value }))}
                  onBlur={(e) => {
                    // Garantir formatação completa ao sair do campo
                    const value = e.target.value.trim();
                    if (!value) {
                      setFormData({ ...formData, limit_amount: '' });
                      return;
                    }
                    const parsed = parseCurrencyInput(value);
                    if (parsed > 0) {
                      const formatted = parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setFormData({ ...formData, limit_amount: formatted });
                    } else {
                      setFormData({ ...formData, limit_amount: '' });
                    }
                  }}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>
            </div>

          </form>
        </div>
        
        {/* Footer fixo */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px] order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !formData.category_id || !formData.limit_amount}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px] order-1 sm:order-2"
          >
            {saving ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar Orçamento')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;