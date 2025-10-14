import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function Categories() {
  const { organization, costCenters, budgetCategories, loading: orgLoading, error: orgError } = useOrganization();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (budgetCategories) {
      setCategories(budgetCategories);
    }
  }, [budgetCategories]);

  async function handleAddCategory() {
    if (!newCategory.trim() || !organization) return;

    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          organization_id: organization.id,
          name: newCategory.trim(),
          description: newDescription.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      setNewCategory('');
      setNewDescription('');
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      setError('Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(categoryId) {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setSaving(true);
    setError(null);

    try {
      // Verificar se há despesas usando esta categoria
      const { count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (count > 0) {
        setError('Não é possível excluir categoria com despesas associadas');
        return;
      }

      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      setError('Erro ao excluir categoria');
    } finally {
      setSaving(false);
    }
  }

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando categorias...</p>
        </div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar dados da organização</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Gerenciar Categorias
          </h1>
          <p className="text-gray-600">
            Configure as categorias de despesas para sua organização
          </p>
        </div>

        {/* Adicionar Nova Categoria */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Adicionar Nova Categoria
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Categoria
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Viagens, Presentes, Esportes"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição da categoria"
                maxLength={100}
              />
            </div>
          </div>

          <Button
            onClick={handleAddCategory}
            disabled={!newCategory.trim() || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Adicionando...' : 'Adicionar Categoria'}
          </Button>
        </Card>

        {/* Lista de Categorias */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Categorias Existentes
          </h2>

          {categories.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-600">Nenhuma categoria criada ainda</p>
              <p className="text-sm text-gray-500 mt-1">Adicione categorias personalizadas para sua organização</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={saving}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Criada em {new Date(category.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Informações */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">💡 Como funciona</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• As categorias são específicas da sua organização</li>
            <li>• A IA usará essas categorias para classificar despesas automaticamente</li>
            <li>• Você pode criar até 20 categorias personalizadas</li>
            <li>• Categorias com despesas não podem ser excluídas</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
