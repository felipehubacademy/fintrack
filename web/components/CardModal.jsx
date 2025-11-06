import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, AlertCircle } from 'lucide-react';

const CARD_COLORS = [
  { value: 'bg-blue-600', label: 'Azul', preview: 'bg-blue-600', hex: '#2563EB' },
  { value: 'bg-orange-600', label: 'Laranja', preview: 'bg-orange-600', hex: '#EA580C' },
  { value: 'bg-purple-600', label: 'Roxo', preview: 'bg-purple-600', hex: '#9333EA' },
  { value: 'bg-green-600', label: 'Verde', preview: 'bg-green-600', hex: '#16A34A' },
  { value: 'bg-gray-600', label: 'Cinza', preview: 'bg-gray-600', hex: '#4B5563' },
  { value: 'bg-red-600', label: 'Vermelho', preview: 'bg-red-600', hex: '#DC2626' }
];

// Função para converter hex para classe CSS
const hexToCssClass = (hex) => {
  const colorMap = {
    '#2563EB': 'bg-blue-600',
    '#EA580C': 'bg-orange-600',
    '#9333EA': 'bg-purple-600',
    '#16A34A': 'bg-green-600',
    '#4B5563': 'bg-gray-600',
    '#DC2626': 'bg-red-600',
    '#3B82F6': 'bg-blue-600' // Fallback padrão
  };
  return colorMap[hex] || 'bg-blue-600';
};

export default function CardModal({ isOpen, onClose, onSave, editingCard = null }) {
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    holder_name: '',
    billing_day: '',
    closing_day: '',
    credit_limit: '',
    color: 'bg-blue-600'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingCard) {
      const creditLimit = parseFloat(editingCard.credit_limit || 0);
      
      // Converter cor hex do banco para classe CSS do formulário
      const cardColor = editingCard.color || '#3B82F6';
      const cssColor = cardColor.startsWith('#') ? hexToCssClass(cardColor) : cardColor;
      
      setFormData({
        name: editingCard.name || '',
        bank: editingCard.bank || '',
        holder_name: editingCard.holder_name || '',
        billing_day: editingCard.billing_day?.toString() || '',
        closing_day: editingCard.closing_day?.toString() || '',
        credit_limit: creditLimit > 0 ? creditLimit.toString() : '',
        color: cssColor
      });
    } else {
      setFormData({
        name: '',
        bank: '',
        holder_name: '',
        billing_day: '',
        closing_day: '',
        credit_limit: '',
        color: 'bg-blue-600'
      });
    }
    setErrors({});
  }, [editingCard, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
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

    if (formData.best_day && (formData.best_day < 1 || formData.best_day > 31)) {
      newErrors.best_day = 'Melhor dia deve ser entre 1 e 31';
    }

    if (!formData.credit_limit || parseFloat(formData.credit_limit) <= 0) {
      newErrors.credit_limit = 'Limite deve ser maior que zero';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Calcular o melhor dia de compra (dia seguinte ao fechamento)
      // Se não tiver closing_day, não calcular best_day
      const closingDay = formData.closing_day ? parseInt(formData.closing_day) : null;
      const bestDay = closingDay && !isNaN(closingDay) 
        ? (closingDay === 31 ? 1 : closingDay + 1)
        : null;

      const creditLimit = parseFloat(formData.credit_limit);
      
      // Converter classe CSS para hex antes de enviar
      const colorHex = CARD_COLORS.find(c => c.value === formData.color)?.hex || '#2563EB';

      const cardData = {
        ...formData,
        billing_day: parseInt(formData.billing_day),
        closing_day: closingDay,
        best_day: bestDay,
        credit_limit: creditLimit,
        color: colorHex // Enviar hex para o banco
      };
      
      // Não definir available_limit - deixar o sistema calcular baseado nas despesas

      await onSave(cardData);
    } catch (error) {
      console.error('Error saving card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      style={{ 
        zIndex: 999999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] bg-white rounded-xl shadow-xl border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">

          <div>
          <form id="card-form" onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Nome do Cartão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Cartão *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Nubank Roxinho"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Banco e Titular */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco *
                </label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => handleChange('bank', e.target.value)}
                  placeholder="Ex: Nubank"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.bank ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.bank && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.bank}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titular *
                </label>
                <input
                  type="text"
                  value={formData.holder_name}
                  onChange={(e) => handleChange('holder_name', e.target.value)}
                  placeholder="Nome do titular"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.holder_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.holder_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.holder_name}
                  </p>
                )}
              </div>
            </div>

            {/* Limite de Crédito */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite de Crédito *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.credit_limit}
                onChange={(e) => handleChange('credit_limit', e.target.value)}
                placeholder="5000.00"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                  errors.credit_limit ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.credit_limit && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.credit_limit}
                </p>
              )}
            </div>

            {/* Dias de vencimento e melhor dia */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia de Vencimento *
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billing_day}
                  onChange={(e) => handleChange('billing_day', e.target.value)}
                  placeholder="15"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.billing_day ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.billing_day && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.billing_day}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia de Fechamento da Fatura
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.closing_day}
                  onChange={(e) => handleChange('closing_day', e.target.value)}
                  placeholder="10"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.closing_day ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.closing_day && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.closing_day}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  💡 O melhor dia de compra será calculado automaticamente (dia seguinte ao fechamento)
                </p>
              </div>
            </div>

            {/* Cor do Cartão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cor do Cartão
              </label>
              <div className="grid grid-cols-6 gap-3">
                {CARD_COLORS.map((color) => (
                  <label key={color.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={color.value}
                      checked={formData.color === color.value}
                      onChange={(e) => handleChange('color', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-6 rounded ${color.preview} ${
                      formData.color === color.value ? 'ring-2 ring-blue-500' : ''
                    }`}></div>
                    <span className="text-sm text-gray-700">{color.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview do Cartão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className={`h-24 ${formData.color} rounded-lg p-4 text-white relative overflow-hidden`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs opacity-80">{formData.bank || 'Banco'}</p>
                    <p className="text-sm font-semibold">{formData.name || 'Nome do Cartão'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-80">Titular</p>
                    <p className="text-sm font-semibold">{formData.holder_name || 'TITULAR'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instrução sobre Despesas - Movido para o final */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                💡 Como configurar o uso do cartão corretamente
              </p>
              <p className="text-xs text-blue-800 mb-2">
                Para que o sistema calcule automaticamente o limite disponível, cadastre todos os lançamentos que já foram feitos neste cartão:
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Despesas já pagas mas ainda não lançadas no sistema</li>
                <li>Parcelas futuras de compras parceladas que já foram iniciadas</li>
                <li>Qualquer gasto feito no cartão antes do cadastro</li>
                <li>Anuidades e taxas do cartão (como anuidade anual, taxa de manutenção, etc.)</li>
                <li>Impostos e encargos relacionados ao cartão (IOF, tarifas, etc.)</li>
                <li>Outros lançamentos que impactam o limite disponível</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2 font-medium">
                O limite disponível será calculado automaticamente com base em todos os lançamentos cadastrados, garantindo maior precisão.
              </p>
            </div>

          </form>
          </div>
        </div>
        
        {/* Footer fixo */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            form="card-form"
            disabled={loading}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px]"
          >
            {loading ? 'Salvando...' : editingCard ? 'Atualizar' : 'Criar Cartão'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
