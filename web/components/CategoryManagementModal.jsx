import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Tag, Plus, Edit, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNotificationContext } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';

export default function CategoryManagementModal({ isOpen, onClose, organization }) {
  const { success, error: showError, warning } = useNotificationContext();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense'); // 'expense' ou 'income'
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366F1'
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const colors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
    '#10B981', '#06B6D4', '#8B5A2B', '#6B7280', '#F97316'
  ];


  useEffect(() => {
    if (isOpen && organization) {
      fetchCategories();
    }
  }, [isOpen, organization, activeTab]); // Adicionar activeTab como dependência

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Buscar categorias globais (organization_id IS NULL) + da organização
      const { data: globalsData, error: globalsError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`type.eq.${activeTab},type.eq.both`)
        .is('organization_id', null)
        .order('name');

      const { data: orgData, error: orgError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`type.eq.${activeTab},type.eq.both`)
        .eq('organization_id', organization.id)
        .order('name');

      if (globalsError || orgError) throw globalsError || orgError;

      // Combinar categorias globais com da organização
      setCategories([...(globalsData || []), ...(orgData || [])]);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      warning('Nome da categoria é obrigatório');
      return;
    }

    try {
      if (editingCategory) {
        // Editar categoria
        const { error } = await supabase
          .from('budget_categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        // Criar nova categoria
        const { error } = await supabase
          .from('budget_categories')
          .insert({
            organization_id: organization.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: formData.color,
            type: activeTab, // Definir tipo: expense ou income
            is_default: false
          });

        if (error) throw error;
      }

      await fetchCategories();
      resetForm();
      success(editingCategory ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      showError('Erro ao salvar categoria');
    }
  };

  const handleEdit = (category) => {
    // Bloquear edição de categorias padrão
    if (category.is_default) {
      warning('Categorias padrão do sistema não podem ser editadas');
      return;
    }
    
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#6366F1'
    });
    setShowForm(true);
  };

  const handleDelete = (categoryId, isDefault, organizationId) => {
    // Bloquear deleção de categorias padrão (tanto globais quanto da organização)
    if (isDefault) {
      warning('Categorias padrão não podem ser excluídas');
      return;
    }

    setCategoryToDelete(categoryId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const { error } = await supabase
        .from('budget_categories')
          .delete()
        .eq('id', categoryToDelete);

      if (error) throw error;

      await fetchCategories();
      success('Categoria excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      showError('Erro ao excluir categoria: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setCategoryToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6366F1'
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">Gerenciar Categorias</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'expense'
                ? 'border-b-2 border-flight-blue text-flight-blue'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'income'
                ? 'border-b-2 border-flight-blue text-flight-blue'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Entradas
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-6">
            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      placeholder="Ex: Alimentação, Transporte..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      placeholder="Ex: Gastos com alimentação fora de casa"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, color })}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-8 border-t border-gray-200">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
                    >
                      {editingCategory ? 'Salvar' : 'Criar'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Categories List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Categorias ({categories.length})</h3>
                {!showForm && (
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                )}
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando categorias...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma categoria encontrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <div key={category.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                      category.is_default ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || '#6366F1' }}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{category.name}</p>
                            {category.is_default && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                Padrão
                              </Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-gray-600">{category.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {!category.is_default && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category.id, category.is_default, category.organization_id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
        
        {/* Footer fixo */}
        <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Fechar
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
