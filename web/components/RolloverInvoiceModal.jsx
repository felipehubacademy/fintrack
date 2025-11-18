import { useState } from 'react';
import { Button } from './ui/Button';
import { X, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-flight-blue/20 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-inner border border-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Lançar saldo restante
              </p>
              <h2 className="text-lg font-semibold text-gray-900">
                {card.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-white/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
            <p className="text-sm text-gray-700 mb-3">
              O saldo restante desta fatura será lançado como uma <strong>despesa fantasma</strong> na próxima fatura.
            </p>
            <div className="flex items-center justify-between py-2 border-t border-amber-200">
              <span className="text-sm font-medium text-gray-600">Valor a transferir:</span>
              <span className="text-xl font-bold text-amber-700">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-start gap-2">
              <span className="text-flight-blue mt-0.5">•</span>
              <span>
                Esta despesa <strong>impactará o limite disponível</strong> do cartão imediatamente.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-flight-blue mt-0.5">•</span>
              <span>
                <strong>Não será criada</strong> uma transação bancária (apenas compromisso futuro).
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-flight-blue mt-0.5">•</span>
              <span>
                A despesa aparecerá na próxima fatura com a descrição <strong>"Saldo anterior"</strong>.
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConfirming}
            className="w-full sm:w-auto border-gray-300 text-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? 'Lançando...' : 'Confirmar transferência'}
          </Button>
        </div>
      </div>
    </div>
  );
}

