import { useState, useEffect } from 'react';
import { Plus, Check, Tag, X, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const defaultCategories = [
  { name: 'Alimentação', color: '#EF4444' },
  { name: 'Transporte', color: '#3B82F6' },
  { name: 'Saúde', color: '#10B981' },
  { name: 'Lazer', color: '#8B5CF6' },
  { name: 'Contas', color: '#F59E0B' },
  { name: 'Casa', color: '#06B6D4' },
  { name: 'Educação', color: '#84CC16' },
  { name: 'Investimentos', color: '#EC4899' },
  { name: 'Outros', color: '#6B7280' }
];

const suggestedCategories = [
  { name: 'Pets', color: '#F97316' },
  { name: 'Assinaturas', color: '#8B5CF6' },
  { name: 'Viagens', color: '#06B6D4' },
  { name: 'Roupas', color: '#EC4899' },
  { name: 'Farmácia', color: '#10B981' }
];

const availableColors = [
  '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#06B6D4', '#84CC16', '#EC4899', '#6B7280', '#F97316',
  '#8B5A2B', '#6366F1', '#14B8A6', '#F43F5E', '#A855F7'
];

export default function CategoriesStep({ organization, onComplete, onDataChange }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [customCategory, setCustomCategory] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6B7280'); // Cor padrão
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
      
      // Separar categorias customizadas (que não são padrão nem sugeridas)
      const customCategories = existingCategories.filter(cat => 
        !defaultCategories.some(dc => dc.name === cat.name) &&
        !suggestedCategories.some(sc => sc.name === cat.name)
      ).map(cat => ({
        ...cat,
        is_custom: true
      }));
      
      setCategories(customCategories);
      
      const selected = new Set(existingCategories.map(c => c.name));
      
      // Sempre incluir categorias essenciais (obrigatórias)
      defaultCategories.forEach(cat => selected.add(cat.name));
      
      setSelectedCategories(selected);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName, isEssential = false) => {
    // Não permitir desmarcar categorias essenciais
    if (isEssential) return;
    
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
      description: customDescription.trim() || null,
      color: selectedColor,
      is_custom: true
    };

    setCategories([...categories, newCategory]);
    toggleCategory(customCategory.trim());
    setCustomCategory('');
    setCustomDescription('');
    setSelectedColor('#6B7280'); // Reset para o padrão
  };

  const removeCustomCategory = (categoryName) => {
    setCategories(categories.filter(c => c.name !== categoryName));
    const newSelected = new Set(selectedCategories);
    newSelected.delete(categoryName);
    setSelectedCategories(newSelected);
  };

  const saveCategories = async () => {
    if (!organization || selectedCategories.size === 0) return;

    setSaving(true);

    try {
      const categoriesToSave = [
        ...defaultCategories.filter(c => selectedCategories.has(c.name)),
        ...suggestedCategories.filter(c => selectedCategories.has(c.name)),
        ...categories.filter(c => c.is_custom && selectedCategories.has(c.name))
      ];

      // Verificar quais categorias já existem
      const { data: existingCategories } = await supabase
        .from('budget_categories')
        .select('name')
        .eq('organization_id', organization.id);

      const existingNames = new Set(existingCategories?.map(c => c.name) || []);

      // Inserir apenas categorias novas
      const newCategories = categoriesToSave.filter(c => !existingNames.has(c.name));

      if (newCategories.length > 0) {
        const { error } = await supabase
          .from('budget_categories')
          .insert(
            newCategories.map(category => ({
              organization_id: organization.id,
              name: category.name,
              description: category.description || null,
              color: category.color,
              is_default: defaultCategories.some(dc => dc.name === category.name) // Marcar categorias padrão
            }))
          );

        if (error) throw error;
      }

      if (onDataChange) {
        onDataChange({ categories: categoriesToSave });
      }

      if (onComplete) {
        onComplete();
      }
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
        <div className="w-16 h-16 border-4 border-[#207DFF]/30 border-t-[#207DFF] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl xl:max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
          Organize por Categorias
        </h2>
        <p className="text-gray-600 text-lg xl:text-xl">
          Selecione as categorias que fazem sentido para você
        </p>
      </div>

      {/* Selected Counter */}
      {selectedCategories.size > 0 && (
        <div className="bg-[#5FFFA7]/10 border border-[#5FFFA7]/30 rounded-2xl p-4 xl:p-5 text-center shadow-lg">
          <p className="text-[#207DFF] font-semibold text-base xl:text-lg">
            ✓ {selectedCategories.size} categoria{selectedCategories.size > 1 ? 's' : ''} selecionada{selectedCategories.size > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Selected Categories */}
      <div>
        <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4">
          Categorias Selecionadas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 xl:gap-4">
          {/* Essential Categories (locked) */}
          {defaultCategories.map((category) => (
            <div
              key={category.name}
              className="p-4 rounded-2xl border-2 border-[#207DFF] bg-[#207DFF]/5 shadow-lg flex items-center space-x-3 cursor-default"
            >
              <div 
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">{category.name}</div>
                <div className="text-xs text-gray-500">Obrigatória</div>
              </div>
              <div className="w-6 h-6 xl:w-7 xl:h-7 bg-[#207DFF] rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 xl:w-5 xl:h-5 text-white" />
              </div>
            </div>
          ))}
          
          {/* Selected Suggested Categories (removable) */}
          {suggestedCategories
            .filter(c => selectedCategories.has(c.name))
            .map((category) => (
              <button
                key={category.name}
                onClick={() => toggleCategory(category.name, false)}
                className="p-4 rounded-2xl border-2 border-green-500 bg-green-50 shadow-lg flex items-center space-x-3 hover:bg-green-100 transition-all"
              >
                <div 
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">{category.name}</div>
                </div>
                <div className="w-6 h-6 xl:w-7 xl:h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 xl:w-5 xl:h-5 text-white" />
                </div>
              </button>
            ))}
          
          {/* Selected Custom Categories (removable) */}
          {categories
            .filter(c => c.is_custom && selectedCategories.has(c.name))
            .map((category) => (
              <button
                key={category.name}
                onClick={() => toggleCategory(category.name, false)}
                className="p-4 rounded-2xl border-2 border-green-500 bg-green-50 shadow-lg flex items-center space-x-3 hover:bg-green-100 transition-all"
              >
                <div 
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900">{category.name}</div>
                </div>
                <div className="w-6 h-6 xl:w-7 xl:h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 xl:w-5 xl:h-5 text-white" />
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Add Custom Category */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 xl:p-8 shadow-lg">
        <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 xl:w-6 xl:h-6 text-[#207DFF]" />
          <span>Criar Categoria Personalizada</span>
        </h3>
        
        {/* Color Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escolha uma cor
          </label>
          <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  selectedColor === color 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex space-x-3">
            <div 
              className="w-14 h-12 border border-gray-300 rounded-xl flex-shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
            <input
              type="text"
              placeholder="Nome da categoria (Ex: Pets, Streaming, Academia...)"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addCustomCategory()}
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3">
            <div className="w-14 flex-shrink-0"></div>
            <input
              type="text"
              placeholder="Descrição (opcional, ex: Gastos com pets e veterinário)"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addCustomCategory()}
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent text-sm"
            />
            <button
              onClick={addCustomCategory}
              disabled={!customCategory.trim()}
              className="px-6 py-3 xl:px-8 xl:py-4 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-semibold text-base xl:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

      </div>

      {/* Suggested Categories */}
      {suggestedCategories.some(c => !selectedCategories.has(c.name)) && (
        <div>
          <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4">
            Sugestões para Você
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 xl:gap-4">
            {suggestedCategories
              .filter(c => !selectedCategories.has(c.name))
              .map((category) => (
                <button
                  key={category.name}
                  onClick={() => toggleCategory(category.name)}
                  className="p-4 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#207DFF]/40 hover:shadow-lg transition-all flex flex-col items-center space-y-2 text-center group"
                >
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="font-semibold text-gray-900 text-sm">{category.name}</div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-white border border-[#207DFF]/20 rounded-2xl p-6 xl:p-8 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Tag className="w-6 h-6 xl:w-7 xl:h-7 text-[#207DFF]" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900 mb-2 text-base xl:text-lg">
              Dica Importante
            </h4>
            <p className="text-gray-600 text-sm xl:text-base">
              Escolha categorias que façam sentido para o seu dia a dia. 
              Você pode adicionar, editar ou remover categorias a qualquer momento nas configurações! 🏷️
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={saveCategories}
          disabled={!canProceed || saving}
          className="px-8 py-4 xl:px-10 xl:py-5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-full font-bold text-lg xl:text-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? 'Salvando...' : canProceed ? 'Salvar e Continuar' : 'Selecione pelo menos uma'}
        </button>
      </div>
    </div>
  );
}
