import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { useNotificationContext } from '../contexts/NotificationContext';

const BudgetModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  budget = null, 
  categories = [], 
  selectedMonth = '2025-10' 
  }) => {
  const { success, error: showError, warning, info } = useNotificationContext();
  
  const [formData, setFormData] = useState({
    category_id: '',
    limit_amount: '',
    category_name: ''
  });
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (budget) {
      setFormData({
        category_id: budget.category_id || '',
        limit_amount: budget.amount?.toString() || '',
        category_name: budget.category || ''
      });
    } else {
      setFormData({
        category_id: '',
        limit_amount: '',
        category_name: ''
      });
    }
    setShowNewCategory(false);
    setNewCategoryName('');
  }, [budget, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.limit_amount) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        category_name: categories.find(c => c.id === formData.category_id)?.name || formData.category_name
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      warning('Digite o nome da nova categoria');
      return;
    }

    // Aqui você pode implementar a criação de categoria
    // Por enquanto, apenas sugere ao usuário
    info(`Para criar a categoria "${newCategoryName}", vá em Configurações > Categorias e crie uma nova categoria. Depois volte aqui para criar o orçamento.`);
    setShowNewCategory(false);
    setNewCategoryName('');
  };

  if (!isOpen) return null;

  const isEdit = !!budget;
  const existingBudgets = categories.filter(cat => 
    categories.some(c => c.id === cat.id) // Simplificado para demonstração
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[95vh] sm:max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg pr-2">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <div className="space-y-2">
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                >
                  <option value="">Selecione uma categoria...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                
                {!showNewCategory ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="flex items-center text-xs sm:text-sm text-flight-blue hover:text-flight-blue/80 w-full sm:w-auto"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Não encontrou a categoria? Criar nova</span>
                  </button>
                ) : (
                  <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-600">
                        Categoria não encontrada
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da nova categoria"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <Button
                        type="button"
                        onClick={handleCreateCategory}
                        size="sm"
                        className="bg-flight-blue hover:bg-flight-blue/90 w-full sm:w-auto"
                      >
                        Criar
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Orçamento (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.limit_amount}
                onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                placeholder="Ex: 1000.00"
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                required
              />
            </div>

            {/* Mês */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mês
              </label>
              <input
                type="text"
                value={selectedMonth}
                disabled
                className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            {/* Aviso sobre duplicação */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-blue-700">
                  <p className="font-medium">Apenas 1 orçamento por categoria por mês</p>
                  <p className="text-blue-600 mt-1">
                    Se precisar de orçamentos diferentes para o mesmo tipo de gasto, 
                    crie categorias específicas (ex: "Alimentação - Casa", "Alimentação - Trabalho").
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer fixo */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !formData.category_id || !formData.limit_amount}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md w-full sm:w-auto order-1 sm:order-2"
          >
            {saving ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar Orçamento')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;