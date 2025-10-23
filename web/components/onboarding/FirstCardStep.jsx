import { useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const CARD_COLORS = [
  { value: 'from-blue-600 to-blue-700', label: 'Azul', preview: 'bg-blue-600' },
  { value: 'from-orange-600 to-orange-700', label: 'Laranja', preview: 'bg-orange-600' },
  { value: 'from-purple-600 to-purple-700', label: 'Roxo', preview: 'bg-purple-600' },
  { value: 'from-green-600 to-green-700', label: 'Verde', preview: 'bg-green-600' },
  { value: 'from-gray-600 to-gray-700', label: 'Cinza', preview: 'bg-gray-600' },
  { value: 'from-red-600 to-red-700', label: 'Vermelho', preview: 'bg-red-600' }
];

export default function FirstCardStep({ organization, user, onComplete, onDataChange }) {
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    holder_name: user?.name || '',
    billing_day: '',
    closing_day: '',
    credit_limit: '',
    color: 'from-blue-600 to-blue-700'
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

    if (!formData.bank.trim()) {
      newErrors.bank = 'Banco é obrigatório';
    }

    if (!formData.holder_name.trim()) {
      newErrors.holder_name = 'Titular é obrigatório';
    }

    if (!formData.billing_day || formData.billing_day < 1 || formData.billing_day > 31) {
      newErrors.billing_day = 'Dia de vencimento deve ser entre 1 e 31';
    }

    if (!formData.closing_day || formData.closing_day < 1 || formData.closing_day > 31) {
      newErrors.closing_day = 'Dia de fechamento deve ser entre 1 e 31';
    }

    if (!formData.credit_limit || parseFloat(formData.credit_limit) <= 0) {
      newErrors.credit_limit = 'Limite deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Calcular o melhor dia de compra (dia seguinte ao fechamento)
      const closingDay = parseInt(formData.closing_day);
      const bestDay = closingDay === 31 ? 1 : closingDay + 1;

      const cardData = {
        organization_id: organization.id,
        name: formData.name.trim(),
        bank: formData.bank.trim(),
        type: 'credit', // Cartão de crédito por padrão
        holder_name: formData.holder_name.trim(),
        billing_day: parseInt(formData.billing_day),
        closing_day: closingDay,
        best_day: bestDay,
        credit_limit: parseFloat(formData.credit_limit),
        available_limit: parseFloat(formData.credit_limit), // Limite disponível = limite total inicialmente
        color: formData.color,
        is_active: true,
        is_primary: true, // Primeiro cartão é sempre primário
        owner_id: user.id // ID do usuário que está criando
      };

      const { data, error } = await supabase
        .from('cards')
        .insert(cardData)
        .select()
        .single();

      if (error) throw error;

      if (onDataChange) {
        onDataChange({ first_card: data });
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('❌ Erro ao salvar cartão:', error);
      setErrors({ submit: 'Erro ao salvar cartão. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-3">
          Cadastre seu Primeiro Cartão
        </h2>
        <p className="text-gray-600 text-lg xl:text-xl">
          Adicione um cartão de crédito para começar a controlar suas despesas
        </p>
      </div>

      {/* Error Alert */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 text-sm">{errors.submit}</p>
        </div>
      )}

      {/* Card Preview */}
      <div className="max-w-md mx-auto">
        <div className={`bg-gradient-to-r ${formData.color} rounded-2xl p-6 text-white shadow-2xl`}>
          <div className="flex justify-between items-start mb-8">
            <CreditCard className="w-10 h-10" />
            <div className="text-right">
              <p className="text-sm opacity-80">Limite</p>
              <p className="text-xl font-bold">
                {formData.credit_limit ? `R$ ${parseFloat(formData.credit_limit).toFixed(2)}` : 'R$ 0,00'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold mb-2">
              {formData.name || 'Nome do Cartão'}
            </p>
            <p className="text-sm opacity-90">{formData.bank || 'Banco'}</p>
          </div>
          <div className="mt-6 flex justify-between items-end">
            <div>
              <p className="text-xs opacity-70">Titular</p>
              <p className="text-sm font-semibold">{formData.holder_name || 'TITULAR'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70">Vencimento</p>
              <p className="text-sm font-semibold">Dia {formData.billing_day || '--'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 xl:p-8 shadow-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Nome do Cartão *
            </label>
            <input
              type="text"
              placeholder="Ex: Nubank, Inter, C6..."
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-4 py-3 bg-white border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent`}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Banco */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Banco *
            </label>
            <input
              type="text"
              placeholder="Ex: Nubank, Bradesco..."
              value={formData.bank}
              onChange={(e) => handleChange('bank', e.target.value)}
              className={`w-full px-4 py-3 bg-white border ${errors.bank ? 'border-red-300' : 'border-gray-300'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent`}
            />
            {errors.bank && <p className="text-red-600 text-xs mt-1">{errors.bank}</p>}
          </div>

          {/* Titular */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Titular do Cartão *
            </label>
            <input
              type="text"
              placeholder="Nome como está no cartão"
              value={formData.holder_name}
              onChange={(e) => handleChange('holder_name', e.target.value)}
              className={`w-full px-4 py-3 bg-white border ${errors.holder_name ? 'border-red-300' : 'border-gray-300'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent`}
            />
            {errors.holder_name && <p className="text-red-600 text-xs mt-1">{errors.holder_name}</p>}
          </div>

          {/* Limite */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Limite do Cartão *
            </label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={formData.credit_limit}
              onChange={(e) => handleChange('credit_limit', e.target.value)}
              className={`w-full px-4 py-3 bg-white border ${errors.credit_limit ? 'border-red-300' : 'border-gray-300'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent`}
            />
            {errors.credit_limit && <p className="text-red-600 text-xs mt-1">{errors.credit_limit}</p>}
          </div>

          {/* Dia de Vencimento */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Dia de Vencimento *
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 10"
              value={formData.billing_day}
              onChange={(e) => handleChange('billing_day', e.target.value)}
              className={`w-full px-4 py-3 bg-white border ${errors.billing_day ? 'border-red-300' : 'border-gray-300'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent`}
            />
            {errors.billing_day && <p className="text-red-600 text-xs mt-1">{errors.billing_day}</p>}
          </div>

          {/* Dia de Fechamento */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Dia de Fechamento da Fatura
            </label>
            <input
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 10"
              value={formData.closing_day}
              onChange={(e) => handleChange('closing_day', e.target.value)}
              className={`w-full px-4 py-3 bg-white border ${errors.closing_day ? 'border-red-300' : 'border-gray-300'} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#207DFF] focus:border-transparent`}
            />
            {errors.closing_day && <p className="text-red-600 text-xs mt-1">{errors.closing_day}</p>}
            <p className="text-xs text-gray-500 mt-1">
              💡 Não sabe? Consulte sua fatura do cartão ou aplicativo do banco
            </p>
          </div>
        </div>

        {/* Cor do Cartão */}
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-3">
            Cor do Cartão
          </label>
          <div className="flex flex-wrap gap-3">
            {CARD_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleChange('color', color.value)}
                className={`
                  w-14 h-14 rounded-xl ${color.preview} transition-all
                  ${formData.color === color.value 
                    ? 'ring-4 ring-[#207DFF] ring-offset-2 scale-110' 
                    : 'hover:scale-105'
                  }
                `}
                title={color.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-white border border-[#207DFF]/20 rounded-2xl p-6 xl:p-8 shadow-lg">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <CreditCard className="w-6 h-6 xl:w-7 xl:h-7 text-[#207DFF]" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900 mb-2 text-base xl:text-lg">
              Por que cadastrar um cartão?
            </h4>
            <p className="text-gray-600 text-sm xl:text-base">
              Com o cartão cadastrado, você pode registrar despesas parceladas, acompanhar o limite disponível e ver quanto ainda vai gastar no mês! 📊
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 xl:px-10 xl:py-5 bg-[#207DFF] hover:bg-[#207DFF]/90 text-white rounded-full font-bold text-lg xl:text-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {saving ? 'Salvando...' : 'Salvar e Continuar'}
        </button>
      </div>
    </div>
  );
}

