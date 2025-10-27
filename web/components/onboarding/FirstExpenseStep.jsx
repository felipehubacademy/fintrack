import { useState, useEffect } from 'react';
import { DollarSign, Calendar, Tag, User, CreditCard, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const paymentMethods = [
  { value: 'pix', label: 'PIX', icon: '💸' },
  { value: 'credit', label: 'Crédito', icon: '💳' },
  { value: 'debit', label: 'Débito', icon: '💳' },
  { value: 'cash', label: 'Dinheiro', icon: '💵' }
];

export default function FirstExpenseStep({ organization, user, onComplete, onDataChange }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    responsible: '',
    payment_method: 'pix'
  });
  const [categories, setCategories] = useState([]);
  const [responsibles, setResponsibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [organization]);

  const loadData = async () => {
    if (!organization) return;

    try {
      // Buscar categorias GLOBAIS
      const { data: categoriesData } = await supabase
        .from('budget_categories')
        .select('*')
        .is('organization_id', null)
        .or('type.eq.expense,type.eq.both');

      const { data: responsiblesData } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organization.id);

      setCategories(categoriesData || []);
      setResponsibles(responsiblesData || []);

      if (categoriesData && categoriesData.length > 0) {
        setFormData(prev => ({ ...prev, category: categoriesData[0].name }));
      }
      if (responsiblesData && responsiblesData.length > 0) {
        setFormData(prev => ({ ...prev, responsible: responsiblesData[0].name }));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value) => {
    const numbers = value.replace(/\D/g, '');
    const amount = numbers / 100;
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleAmountChange = (value) => {
    const numbers = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, amount: numbers }));
  };

  const saveExpense = async () => {
    if (!formData.description || !formData.amount || !formData.category || !formData.responsible) {
      return;
    }

    setSaving(true);
    try {
      const amount = parseFloat(formData.amount) / 100;
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('expenses')
        .insert({
          organization_id: organization.id,
          description: formData.description,
          amount: amount,
          category: formData.category,
          responsible: formData.responsible,
          payment_method: formData.payment_method,
          date: today,
          created_by: user?.id
        });

      if (error) throw error;

      setSuccess(true);
      
      if (onDataChange) {
        onDataChange({ first_expense_created: true });
      }

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('❌ Erro ao salvar despesa:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const canSave = formData.description && formData.amount && formData.category && formData.responsible;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-[#207DFF]/30 border-t-[#207DFF] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl xl:max-w-4xl mx-auto text-center space-y-8 py-12">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 xl:w-40 xl:h-40 bg-gradient-to-br from-[#5FFFA7]/30 to-[#207DFF]/30 rounded-full animate-pulse" />
          </div>
          <div className="relative w-32 h-32 xl:w-40 xl:h-40 mx-auto bg-gradient-to-br from-[#5FFFA7] to-[#207DFF] rounded-full flex items-center justify-center shadow-2xl shadow-[#5FFFA7]/50">
            <CheckCircle className="w-16 h-16 xl:w-20 xl:h-20 text-white animate-[bounce_1s_ease-in-out]" />
          </div>
        </div>
        <div>
          <h2 className="text-4xl xl:text-5xl font-bold text-white mb-3">
            Primeira Despesa Registrada! 🎉
          </h2>
          <p className="text-white/80 text-lg xl:text-xl">
            Agora você já pode ver suas análises no dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-[#207DFF] to-[#8FCBFF] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#207DFF]/40">
          <TrendingUp className="w-10 h-10 xl:w-12 xl:h-12 text-white" />
        </div>
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-3">
          Registre sua Primeira Despesa
        </h2>
        <p className="text-white/80 text-lg xl:text-xl">
          Vamos testar como funciona o registro manual
        </p>
      </div>

      {/* Form */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 md:p-8 xl:p-10 space-y-6">
        {/* Description */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Descrição
          </label>
          <input
            type="text"
            placeholder="Ex: Compras do mercado"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Valor
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="R$ 0,00"
              value={formData.amount ? formatCurrency(formData.amount) : ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-2xl font-bold placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category & Responsible */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Responsável
            </label>
            <select
              value={formData.responsible}
              onChange={(e) => handleChange('responsible', e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {responsibles.map(resp => (
                <option key={resp.id} value={resp.name}>{resp.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-3">
            Forma de Pagamento
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {paymentMethods.map(method => (
              <button
                key={method.value}
                onClick={() => handleChange('payment_method', method.value)}
                className={`
                  p-4 rounded-xl border-2 transition-all flex flex-col items-center space-y-2
                  ${formData.payment_method === method.value
                    ? 'border-orange-400 bg-orange-500/20 scale-105'
                    : 'border-white/20 bg-white/10 hover:bg-white/15'
                  }
                `}
              >
                <span className="text-3xl">{method.icon}</span>
                <span className="text-white font-medium text-sm">{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveExpense}
          disabled={!canSave || saving}
          className="w-full px-6 py-4 xl:py-5 bg-gradient-to-r from-[#207DFF] to-[#0D2C66] hover:from-[#207DFF] hover:to-[#207DFF] text-white rounded-xl font-bold text-lg xl:text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#207DFF]/30 hover:shadow-xl hover:shadow-[#207DFF]/50 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Registrar Despesa</span>
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-[#207DFF]/20 to-[#8FCBFF]/20 backdrop-blur-xl border border-[#207DFF]/30 rounded-2xl p-6 xl:p-8">
        <div className="flex items-start space-x-4">
          <Sparkles className="w-6 h-6 xl:w-7 xl:h-7 text-[#5FFFA7] flex-shrink-0 mt-1" />
          <div className="text-left">
            <h4 className="font-semibold text-white mb-2 text-base xl:text-lg">
              Dica do Zul
            </h4>
            <p className="text-white/80 text-sm xl:text-base">
              Você também pode fazer isso conversando comigo no WhatsApp! 
              Basta enviar: <span className="font-mono bg-white/10 px-2 py-1 rounded">"Gastei 50 no mercado"</span>
            </p>
          </div>
        </div>
      </div>

      {/* Skip Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSkip}
          className="px-6 py-3 text-white/70 hover:text-white text-sm transition-colors"
        >
          Pular por enquanto
        </button>
      </div>
    </div>
  );
}
