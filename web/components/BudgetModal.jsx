import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Target, X, Save } from 'lucide-react';

export default function BudgetModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingBudget, 
  costCenters = [], 
  categories = [],
  selectedMonth 
}) {
  const [formData, setFormData] = useState({
    category_id: '',
    amount: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingBudget) {
      setFormData({
        category_id: editingBudget.category_id || '',
        amount: editingBudget.amount?.toString() || ''
      });
    } else {
      setFormData({
        category_id: '',
        amount: ''
      });
    }
  }, [editingBudget]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category_id || !formData.amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      const budgetData = {
        ...formData,
        limit_amount: parseFloat(formData.amount),
        month_year: selectedMonth + '-01',
        ...(editingBudget && { id: editingBudget.id })
      };

      await onSave(budgetData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <span>{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</span>
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor do Orçamento *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p><strong>Período:</strong> {new Date(selectedMonth + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                <p><strong>Funcionalidade:</strong> Orçamento da família para esta categoria. Todas as despesas da categoria serão somadas, independente de quem gastou.</p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : (editingBudget ? 'Salvar' : 'Criar')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
