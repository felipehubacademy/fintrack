import { useState, useEffect } from 'react';
import { Plus, Trash2, User, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const defaultColors = [
  '#3B82F6', '#EC4899', '#8B5CF6', '#10B981', 
  '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'
];

export default function ResponsiblesStep({ organization, onComplete, onDataChange }) {
  const [responsibles, setResponsibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResponsibles();
  }, [organization]);

  const loadResponsibles = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at');

      if (error) throw error;

      setResponsibles(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar responsáveis:', error);
      setError('Erro ao carregar responsáveis');
    } finally {
      setLoading(false);
    }
  };

  const addResponsible = () => {
    const newResponsible = {
      id: `temp-${Date.now()}`,
      name: '',
      color: defaultColors[responsibles.length % defaultColors.length],
      type: 'individual',
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
          type: responsible.type
        };

        if (responsible.is_new) {
          await supabase
            .from('cost_centers')
            .insert(data);
        } else {
          await supabase
            .from('cost_centers')
            .update(data)
            .eq('id', responsible.id);
        }
      }

      if (onDataChange) {
        onDataChange({ responsibles_configured: validResponsibles.length });
      }

      onComplete();
    } catch (error) {
      console.error('❌ Erro ao salvar responsáveis:', error);
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = responsibles.some(r => r.name.trim());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30">
          <Users className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Quem faz parte?
        </h2>
        <p className="text-white/80 text-lg">
          Configure os responsáveis pelas despesas da família
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Responsibles List */}
      <div className="space-y-4">
        {responsibles.map((responsible, index) => (
          <div
            key={responsible.id}
            className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Name Input */}
              <div className="flex-1">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Nome do Responsável
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Ex: João, Maria, Família..."
                    value={responsible.name}
                    onChange={(e) => updateResponsible(responsible.id, 'name', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type Select */}
              <div className="w-full md:w-48">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Tipo
                </label>
                <select
                  value={responsible.type}
                  onChange={(e) => updateResponsible(responsible.id, 'type', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="individual">Individual</option>
                  <option value="shared">Compartilhado</option>
                </select>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
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
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-white/30'
                        }
                      `}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => removeResponsible(responsible.id)}
                className="self-end md:self-center p-3 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Shared Explanation */}
            {responsible.type === 'shared' && (
              <div className="mt-4 p-4 bg-blue-500/20 border border-blue-400/30 rounded-xl">
                <p className="text-white/80 text-sm flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Compartilhado:</strong> Despesas divididas entre todos os membros da família
                  </span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={addResponsible}
        className="w-full p-6 border-2 border-dashed border-white/30 rounded-2xl hover:border-blue-400 hover:bg-white/10 transition-all flex items-center justify-center space-x-3 group"
      >
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
          <Plus className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-lg">Adicionar Responsável</span>
      </button>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <User className="w-6 h-6 text-purple-300" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2">
              Dica Importante
            </h4>
            <p className="text-white/80 text-sm">
              Adicione todos os membros da família que vão registrar despesas. 
              Cada um terá suas próprias análises e você poderá ver o total geral! 📊
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={saveResponsibles}
          disabled={!canProceed || saving}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? 'Salvando...' : canProceed ? 'Salvar e Continuar' : 'Adicione pelo menos um'}
        </button>
      </div>
    </div>
  );
}
