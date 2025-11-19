import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/Button';

export default function RolloverInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  invoice,
  card,
  remainingAmount
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen || !invoice || !card) return null;

  const formatCurrency = (value) => {
    if (Number.isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
              Lançar saldo restante
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
          <p className="text-gray-600 mb-4 md:mb-6 text-sm md:text-base">
            O saldo restante desta fatura será lançado como uma despesa na próxima fatura.
          </p>

          {/* Valor */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Valor a transferir:</span>
              <span className="text-2xl font-bold text-red-700">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>

          {/* Disclaimers */}
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5 font-bold">•</span>
              <span>
                A despesa aparecerá na próxima fatura com a descrição <strong>"Saldo anterior"</strong>.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5 font-bold">•</span>
              <span>
                Eventuais <strong>encargos e juros</strong> calculados pelo banco precisarão ser lançados manualmente.
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConfirming}
              className="w-full sm:w-auto px-6 py-2 min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full sm:w-auto px-6 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white"
            >
              {isConfirming ? 'Lançando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
