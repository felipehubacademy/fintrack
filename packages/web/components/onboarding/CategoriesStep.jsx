import { useState, useEffect } from 'react';
import { Plus, Check, Tag, X, Sparkles, Lightbulb, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import ZulFloatingButton from '../ZulFloatingButton';

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
  { name: 'Roupas', color: '#EC4899' }
];

const availableColors = [
  '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#06B6D4', '#84CC16', '#EC4899', '#6B7280', '#F97316',
  '#8B5A2B', '#6366F1', '#14B8A6', '#F43F5E', '#A855F7'
];

export default function CategoriesStep({ organization, onComplete, onDataChange, onboardingType }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [orgCategoryNames, setOrgCategoryNames] = useState(new Set()); // Para bloquear categorias da org
  const [customCategory, setCustomCategory] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6B7280'); // Cor padrão
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showZulCard, setShowZulCard] = useState(false);
  const isInvited = onboardingType === 'invited';
  
  // Mostrar card com delay para sincronizar com ZulFloatingButton
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowZulCard(true);
    }, 1500); // Delay para sincronizar com o Zul
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [organization]);

  const loadCategories = async () => {
    if (!organization) return;

    try {
      let existingCategories = [];
      
      if (isInvited) {
        // Para convidados: carregar categorias da organização + globais
        const [orgCategories, globalCategories] = await Promise.all([
          supabase
            .from('budget_categories')
            .select('*')
            .eq('organization_id', organization.id)
            .or('type.eq.expense,type.eq.both')
            .order('name'),
          supabase
            .from('budget_categories')
            .select('*')
            .is('organization_id', null)
            .or('type.eq.expense,type.eq.both')
            .order('name')
        ]);
        
        if (orgCategories.error) throw orgCategories.error;
        if (globalCategories.error) throw globalCategories.error;
        
        console.log('🔍 [CATEGORIES] Org categories:', orgCategories.data);
        console.log('🔍 [CATEGORIES] Global categories:', globalCategories.data);
        
        // Combinar categorias da org + globais (sem duplicatas)
        // PRIORIZAR categorias da organização sobre as globais
        const orgCategoriesList = orgCategories.data || [];
        const globalCategoriesList = globalCategories.data || [];
        
        // Criar map de nomes de categorias da org
        const orgCategoryNames = new Set(orgCategoriesList.map(c => c.name));
        
        // Adicionar categorias da org primeiro
        existingCategories = [...orgCategoriesList];
        
        // Adicionar apenas globais que NÃO existem na org
        const uniqueGlobals = globalCategoriesList.filter(globalCat => 
          !orgCategoryNames.has(globalCat.name)
        );
        
        existingCategories = [...existingCategories, ...uniqueGlobals];
        
        // Para convidados, selecionar todas as categorias da org
        const orgCategoryIdSet = new Set(orgCategoriesList.map(cat => cat.id || cat.name));
        setSelectedCategories(orgCategoryIdSet);
        
        // Guardar nomes das categorias da org para bloquear edição
        setOrgCategoryNames(new Set(orgCategoriesList.map(cat => cat.name)));
      } else {
        // Para admin/solo: buscar categorias GLOBAIS
        const { data, error } = await supabase
          .from('budget_categories')
          .select('*')
          .is('organization_id', null)
          .or('type.eq.expense,type.eq.both')
          .order('name');

        if (error) throw error;
        existingCategories = data || [];
      }
      
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
    // Para convidados: não permitir desmarcar categorias da organização
    if (isInvited && orgCategoryNames.has(categoryName)) {
      return; // Bloqueia toggle de categorias da org
    }
    
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

      // Verificar quais categorias já existem (apenas customizadas pela org)
      const { data: existingCategories } = await supabase
        .from('budget_categories')
        .select('name')
        .eq('organization_id', organization.id);

      const existingNames = new Set(existingCategories?.map(c => c.name) || []);

      // Categorias globais já existem no banco
      // Usuários podem criar categorias customizadas depois no CategoryManagementModal
      // Não precisamos criar categorias por org aqui

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
    <>
      {/* Floating Zul Button */}
      <ZulFloatingButton />
      
      {/* Zul Info Card */}
      {showZulCard && (
        <div className="fixed bottom-28 right-28 w-80 z-50 pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
          <Card className="shadow-lg border border-gray-200 bg-white relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowZulCard(false)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
            >
              <X className="h-3 w-3 text-gray-500" />
            </Button>
            
            <CardContent className="p-4">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-12 h-12 bg-[#207DFF] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Tag className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base">Dica Importante</h4>
                  <p className="text-xs text-gray-600">Sobre categorias</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    Escolha ou crie categorias que façam sentido para o seu dia a dia. Você pode adicionar, editar ou remover categorias a qualquer momento nas configurações!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="max-w-5xl xl:max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
          Organize por Categorias
        </h2>
        <p className="text-gray-600 text-lg xl:text-xl">
          Selecione ou crie as categorias que fazem sentido para você
        </p>
      </div>

      {/* Selected Categories */}
      <div>
        <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4">
          Categorias Selecionadas {selectedCategories.size > 0 && `(${selectedCategories.size})`}
        </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
          {/* Essential Categories (locked) */}
          {defaultCategories.map((category) => (
            <div
              key={category.name}
              className="p-3 rounded-xl border-2 border-[#207DFF] bg-[#207DFF]/5 shadow-md flex items-center space-x-2 cursor-default relative"
            >
              <div 
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <div className="text-left flex-1">
                <div className="font-semibold text-gray-900 text-sm">{category.name}</div>
              </div>
              <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#207DFF] rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          ))}
          
          {/* Selected Suggested Categories (removable) */}
          {suggestedCategories
            .filter(c => selectedCategories.has(c.name))
            .map((category) => {
              const isLocked = isInvited && orgCategoryNames.has(category.name);
              return (
              <button
                key={category.name}
                onClick={() => toggleCategory(category.name, false)}
                className={`p-3 rounded-xl border-2 flex items-center space-x-2 transition-all relative ${
                  isLocked 
                    ? 'border-green-600 bg-green-100 cursor-not-allowed opacity-75' 
                    : 'border-green-500 bg-green-50 hover:bg-green-100'
                }`}
                disabled={isLocked}
              >
                <div 
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 text-sm">{category.name}</div>
                </div>
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              </button>
            );
            })}
          
          {/* Selected Custom Categories (removable) */}
          {categories
            .filter(c => c.is_custom && selectedCategories.has(c.name))
            .map((category) => (
              <button
                key={category.name}
                onClick={() => toggleCategory(category.name, false)}
                className="p-3 rounded-xl border-2 border-green-500 bg-green-50 shadow-md flex items-center space-x-2 hover:bg-green-100 transition-all relative"
              >
                <div 
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 text-sm">{category.name}</div>
                </div>
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* Add Custom Category */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 xl:p-8 shadow-lg">
        <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4">
          Criar Categoria Personalizada
        </h3>
        
        {/* All in one line */}
        <div className="flex items-center space-x-3">
          {/* Preview circle (same size as category) */}
          <div 
            className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-gray-300"
            style={{ backgroundColor: selectedColor }}
          />
          
          {/* Name input */}
          <input
            type="text"
            placeholder="Nome"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addCustomCategory()}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
          />
          
          {/* Description input */}
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && addCustomCategory()}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent text-sm"
          />
          
          {/* Add button (smaller) */}
          <button
            onClick={addCustomCategory}
            disabled={!customCategory.trim()}
            className="px-4 py-2.5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </div>
        
        {/* Full color palette below (optional) */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione uma cor
          </label>
          <div className="flex flex-wrap gap-2">
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

      </div>

      {/* Suggested Categories */}
      {suggestedCategories.some(c => !selectedCategories.has(c.name)) && (
        <div>
          <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4">
            Sugestões para Você {suggestedCategories.filter(c => !selectedCategories.has(c.name)).length > 0 && `(${suggestedCategories.filter(c => !selectedCategories.has(c.name)).length})`}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
            {suggestedCategories
              .filter(c => !selectedCategories.has(c.name))
              .map((category) => (
                <button
                  key={category.name}
                  onClick={() => toggleCategory(category.name)}
                  className="p-3 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-[#207DFF]/40 hover:shadow-md transition-all flex items-center space-x-2 group"
                >
                  <div 
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="font-semibold text-gray-900 text-xs sm:text-sm text-left">{category.name}</div>
                </button>
              ))}
          </div>
        </div>
      )}


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
    </>
  );
}
