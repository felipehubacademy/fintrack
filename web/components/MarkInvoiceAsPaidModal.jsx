import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X, AlertCircle } from 'lucide-react';

export default function MarkInvoiceAsPaidModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  invoice,
  card,
  costCenters = [],
  organization = null
}) {
  const [selectedOwner, setSelectedOwner] = useState('');
  const [isShared, setIsShared] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Resetar seleção ao abrir
      setIsShared(false);
      setSelectedOwner('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Validar que tem responsável selecionado OU está marcado como compartilhado
    if (!isShared && !selectedOwner) {
      return;
    }
    
    onConfirm({
      cost_center_id: isShared ? null : selectedOwner,
      is_shared: isShared
    });
  };

  if (!isOpen || !invoice || !card) return null;

  const ownerOptions = costCenters
    .filter(cc => cc.is_active !== false && !cc.is_shared)
    .map(cc => ({ value: cc.id, label: cc.name }));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Marcar fatura como paga
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-2">
            Cartão: <strong>{card.name}</strong>
          </p>
          <p className="text-gray-600 mb-2">
            Valor: <strong>{formatCurrency(invoice.total)}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Isso criará uma despesa e liberará o limite do cartão.
          </p>

          {/* Quem pagou? */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quem pagou? *
            </label>
            
            {/* Opção Compartilhado */}
            <div className="mb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isShared}
                  onChange={() => {
                    setIsShared(true);
                    setSelectedOwner('');
                  }}
                  className="w-4 h-4 text-flight-blue focus:ring-flight-blue border-gray-300"
                />
                <span className="text-gray-700">
                  {organization?.name || 'Família'}
                </span>
              </label>
            </div>

            {/* Opção Individual */}
            <div className="mb-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isShared}
                  onChange={() => {
                    setIsShared(false);
                    // Se não tem seleção, usar primeiro cost center
                    if (!selectedOwner && ownerOptions.length > 0) {
                      setSelectedOwner(ownerOptions[0].value);
                    }
                  }}
                  className="w-4 h-4 text-flight-blue focus:ring-flight-blue border-gray-300"
                />
                <span className="text-gray-700">Individual</span>
              </label>
            </div>

            {/* Select de responsável (se individual) */}
            {!isShared && (
              <div className="ml-6 mt-2">
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                >
                  <option value="">Selecione o responsável...</option>
                  {ownerOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isShared && !selectedOwner}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Marcar como Paga
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

