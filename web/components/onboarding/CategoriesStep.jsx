import { useState, useEffect } from 'react';
import { Plus, Check, Tag, X, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const defaultCategories = [
  { name: 'Alimentação', icon: '🍽️', color: '#EF4444' },
  { name: 'Transporte', icon: '🚗', color: '#3B82F6' },
  { name: 'Saúde', icon: '🏥', color: '#10B981' },
  { name: 'Lazer', icon: '🎬', color: '#8B5CF6' },
  { name: 'Contas', icon: '💡', color: '#F59E0B' },
  { name: 'Casa', icon: '🏠', color: '#06B6D4' },
  { name: 'Educação', icon: '📚', color: '#84CC16' },
  { name: 'Investimentos', icon: '📈', color: '#EC4899' },
  { name: 'Outros', icon: '📦', color: '#6B7280' }
];

const suggestedCategories = [
  { name: 'Pets', icon: '🐕', color: '#F97316' },
  { name: 'Assinaturas', icon: '📱', color: '#8B5CF6' },
  { name: 'Viagens', icon: '✈️', color: '#06B6D4' },
  { name: 'Roupas', icon: '👕', color: '#EC4899' },
  { name: 'Farmácia', icon: '💊', color: '#10B981' }
];

export default function CategoriesStep({ organization, onComplete, onDataChange }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [organization]);

  const loadCategories = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at');

      if (error) throw error;

      const existingCategories = data || [];
      setCategories(existingCategories);
      
      const selected = new Set(existingCategories.map(c => c.name));
      setSelectedCategories(selected);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const addCustomCategory = () => {
    if (!customCategory.trim()) return;

    const newCategory = {
      name: customCategory.trim(),
      icon: '📦',
      color: '#6B7280',
      is_custom: true
    };

    setCategories([...categories, newCategory]);
    setSelectedCategories(prev => new Set([...prev, newCategory.name]));
    setCustomCategory('');
  };

  const addSuggested = (category) => {
    if (selectedCategories.has(category.name)) return;
    
    setCategories([...categories, { ...category, is_custom: true }]);
    setSelectedCategories(prev => new Set([...prev, category.name]));
  };

  const saveCategories = async () => {
    if (!organization) return;

    setSaving(true);
    try {
      const allCategories = [...defaultCategories, ...categories.filter(c => c.is_custom)];
      const categoriesToSave = allCategories.filter(cat => selectedCategories.has(cat.name));

      await supabase
        .from('budget_categories')
        .delete()
        .eq('organization_id', organization.id);

      if (categoriesToSave.length > 0) {
        const insertData = categoriesToSave.map(cat => ({
          organization_id: organization.id,
          name: cat.name,
          color: cat.color,
          is_default: !cat.is_custom
        }));

        await supabase
          .from('budget_categories')
          .insert(insertData);
      }

      if (onDataChange) {
        onDataChange({ categories_selected: categoriesToSave.length });
      }

      onComplete();
    } catch (error) {
      console.error('❌ Erro ao salvar categorias:', error);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = selectedCategories.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30">
          <Tag className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Organize por Categorias
        </h2>
        <p className="text-white/80 text-lg">
          Selecione as categorias que fazem sentido para você
        </p>
      </div>

      {/* Selected Counter */}
      {selectedCategories.size > 0 && (
        <div className="bg-green-500/20 backdrop-blur-xl border border-green-400/30 rounded-2xl p-4 text-center">
          <p className="text-green-200 font-semibold">
            ✓ {selectedCategories.size} categoria{selectedCategories.size > 1 ? 's' : ''} selecionada{selectedCategories.size > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Default Categories */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <span>Categorias Essenciais</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {defaultCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => toggleCategory(category.name)}
              className={`
                p-4 rounded-2xl border-2 transition-all flex items-center space-x-3 group
                ${selectedCategories.has(category.name)
                  ? 'border-white/40 bg-white/20 backdrop-blur-xl shadow-lg scale-105'
                  : 'border-white/20 bg-white/10 backdrop-blur-xl hover:bg-white/15 hover:border-white/30'
                }
              `}
            >
              <div className="text-3xl">{category.icon}</div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white">{category.name}</div>
              </div>
              {selectedCategories.has(category.name) && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add Custom Category */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span>Criar Categoria Personalizada</span>
        </h3>
        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Ex: Pets, Streaming, Academia..."
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={addCustomCategory}
            disabled={!customCategory.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Custom Categories List */}
        {categories.filter(c => c.is_custom).length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.filter(c => c.is_custom).map((category) => (
              <div
                key={category.name}
                className="p-4 rounded-2xl border-2 border-green-400/30 bg-green-500/20 backdrop-blur-xl flex items-center space-x-3"
              >
                <div className="text-2xl">{category.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{category.name}</div>
                  <div className="text-green-300 text-xs">Personalizada</div>
                </div>
                <button
                  onClick={() => {
                    setCategories(categories.filter(c => c.name !== category.name));
                    setSelectedCategories(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(category.name);
                      return newSet;
                    });
                  }}
                  className="p-2 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Categories */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Sugestões Populares</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {suggestedCategories.filter(s => !selectedCategories.has(s.name)).map((category) => (
            <button
              key={category.name}
              onClick={() => addSuggested(category)}
              className="p-4 rounded-2xl border-2 border-dashed border-white/30 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all flex items-center space-x-3"
            >
              <div className="text-2xl">{category.icon}</div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-white">{category.name}</div>
              </div>
              <Plus className="w-5 h-5 text-white/60" />
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <Tag className="w-6 h-6 text-blue-300 flex-shrink-0 mt-1" />
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2">
              Por que categorizar?
            </h4>
            <p className="text-white/80 text-sm">
              As categorias ajudam você a entender para onde seu dinheiro está indo. 
              O Zul usa isso para criar análises inteligentes e identificar padrões! 📊
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={saveCategories}
          disabled={!canProceed || saving}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? 'Salvando...' : canProceed ? `Salvar ${selectedCategories.size} Categorias` : 'Selecione pelo menos uma'}
        </button>
      </div>
    </div>
  );
}
