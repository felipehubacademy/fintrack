import { useState, useEffect } from 'react';
import { Plus, Trash2, User, CheckCircle, AlertCircle, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const defaultColors = [
  '#3B82F6', '#EC4899', '#8B5CF6', '#10B981', 
  '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'
];

export default function ResponsiblesStep({ organization, user, onComplete, onDataChange }) {
  const [responsibles, setResponsibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResponsibles();
  }, [organization]);

  const loadResponsibles = async () => {
    if (!organization || !user) return;

    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at');

      if (error) throw error;

      // Se não tem nenhum centro, criar o do usuário atual automaticamente
      if (!data || data.length === 0) {
        const newCenter = {
          id: `temp-${Date.now()}`,
          name: user.name || 'Você',
          color: defaultColors[0],
          default_split_percentage: 100,
          user_id: user.id,
          linked_email: user.email,
          is_new: true
        };
        setResponsibles([newCenter]);
      } else {
        setResponsibles(data);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar responsáveis:', error);
      setError('Erro ao carregar responsáveis');
    } finally {
      setLoading(false);
    }
  };

  const addResponsible = () => {
    // Calcular percentual sugerido
    const totalPercentage = responsibles.reduce((sum, r) => sum + (parseFloat(r.default_split_percentage) || 0), 0);
    const suggestedPercentage = totalPercentage >= 100 ? 0 : Math.max(0, 100 - totalPercentage);
    
    const newResponsible = {
      id: `temp-${Date.now()}`,
      name: '',
      color: defaultColors[responsibles.length % defaultColors.length],
      default_split_percentage: suggestedPercentage,
      is_new: true
    };
    setResponsibles([...responsibles, newResponsible]);
  };

  const removeResponsible = (id) => {
    setResponsibles(responsibles.filter(r => r.id !== id));
  };

  const updateResponsible = (id, field, value) => {
    setResponsibles(responsibles.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const saveResponsibles = async () => {
    if (!organization) return;

    // Validação
    const validResponsibles = responsibles.filter(r => r.name.trim());
    if (validResponsibles.length === 0) {
      setError('Adicione pelo menos um responsável');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Adicionar/atualizar responsáveis
      for (const responsible of validResponsibles) {
        const data = {
          organization_id: organization.id,
          name: responsible.name.trim(),
          color: responsible.color,
          default_split_percentage: parseFloat(responsible.default_split_percentage) || 0,
          user_id: responsible.user_id || null,
          linked_email: responsible.linked_email || null,
          is_active: true
        };

        if (responsible.is_new) {
          const { error } = await supabase
            .from('cost_centers')
            .insert(data);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('cost_centers')
            .update(data)
            .eq('id', responsible.id);

          if (error) throw error;
        }
      }

      if (onDataChange) {
        onDataChange({ responsibles: validResponsibles });
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('❌ Erro ao salvar responsáveis:', error);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getTotalPercentage = () => {
    return responsibles.reduce((sum, r) => sum + (parseFloat(r.default_split_percentage) || 0), 0);
  };

  const canProceed = responsibles.some(r => r.name.trim());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-[#207DFF]/30 border-t-[#207DFF] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
          Quem faz parte?
        </h2>
        <p className="text-gray-600 text-lg xl:text-xl">
          Configure os responsáveis pelas despesas da família
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Total Percentage Indicator */}
      {responsibles.length > 0 && (
        <div className={`
          flex items-center justify-between px-6 py-3 rounded-xl border transition-all
          ${getTotalPercentage() === 100 
            ? 'bg-green-50/50 border-green-200 text-green-700' 
            : getTotalPercentage() > 100
            ? 'bg-orange-50/50 border-orange-200 text-orange-700'
            : 'bg-blue-50/50 border-blue-200 text-blue-700'
          }
        `}>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <span className="text-2xl font-bold">{getTotalPercentage().toFixed(0)}%</span>
          </div>
          {getTotalPercentage() !== 100 && (
            <span className="text-xs font-medium opacity-70">
              {getTotalPercentage() > 100 
                ? `+${(getTotalPercentage() - 100).toFixed(0)}% acima` 
                : `${(100 - getTotalPercentage()).toFixed(0)}% restante`}
            </span>
          )}
        </div>
      )}

      {/* Responsibles List */}
      <div className="space-y-4">
        {responsibles.map((responsible, index) => (
          <div
            key={responsible.id}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:border-[#207DFF]/30 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Name Input */}
              <div className="flex-1">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Nome do Centro de Custo
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ex: João, Maria, Casa, Filhos..."
                    value={responsible.name}
                    onChange={(e) => updateResponsible(responsible.id, 'name', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
                  />
                </div>
                {responsible.user_id && (
                  <p className="text-xs text-gray-500 mt-1">✓ Vinculado a você</p>
                )}
              </div>

              {/* Percentage Input */}
              <div className="w-full md:w-32">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  % Padrão
                </label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="50"
                    value={responsible.default_split_percentage || ''}
                    onChange={(e) => updateResponsible(responsible.id, 'default_split_percentage', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      onClick={() => updateResponsible(responsible.id, 'color', color)}
                      className={`
                        w-10 h-10 rounded-xl border-2 transition-all hover:scale-110
                        ${responsible.color === color 
                          ? 'border-gray-900 scale-110 shadow-lg' 
                          : 'border-gray-300'
                        }
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Delete Button */}
              {!responsible.user_id && (
                <button
                  onClick={() => removeResponsible(responsible.id)}
                  className="self-end md:self-start p-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={addResponsible}
        className="w-full p-6 xl:p-8 border-2 border-dashed border-gray-300 rounded-2xl hover:border-[#207DFF] hover:bg-gray-50 transition-all flex items-center justify-center space-x-3 group"
      >
        <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#207DFF] transition-colors">
          <Plus className="w-5 h-5 xl:w-6 xl:h-6 text-gray-600 group-hover:text-white" />
        </div>
        <span className="text-gray-900 font-semibold text-lg xl:text-xl">Adicionar Responsável</span>
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 xl:p-8 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-6 h-6 xl:w-7 xl:h-7 text-[#207DFF]" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900 mb-3 text-base xl:text-lg">
              💡 Como funciona?
            </h4>
            <div className="space-y-2 text-sm xl:text-base text-gray-600">
              <p>
                Crie centros de custo para organizar suas despesas. Você pode criar centros para pessoas 
                (ex: "João", "Maria") ou categorias (ex: "Casa", "Filhos", "Lazer").
              </p>
              <p className="pt-2 border-t border-blue-200">
                <strong>Percentual Padrão:</strong> É apenas uma sugestão inicial. Ao registrar cada despesa, 
                você pode ajustar os percentuais livremente.
              </p>
              <p className="text-xs xl:text-sm">
                💡 <strong>Dica:</strong> O total não precisa ser exatamente 100% agora. Você pode ajustar depois em Configurações!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={saveResponsibles}
          disabled={!canProceed || saving}
          className="px-8 py-4 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Salvar e Continuar'}
        </button>
      </div>
    </div>
  );
}
