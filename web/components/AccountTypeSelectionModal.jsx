import { useState } from 'react';
import { X, Link2, Edit3, Sparkles, Shield } from 'lucide-react';
import { Button } from './ui/Button';

export default function AccountTypeSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectOpenFinance,
  onSelectManual
}) {
  const [selectedType, setSelectedType] = useState(null);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (selectedType === 'open-finance') {
      onSelectOpenFinance();
    } else if (selectedType === 'manual') {
      onSelectManual();
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col overflow-hidden">
        {/* Header - Padrão da aplicação */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
              Como deseja adicionar a conta?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Escolha entre sincronização automática ou controle manual
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
          <div className="space-y-3 md:space-y-4">
            {/* Opção Open Finance */}
            <div 
              onClick={() => setSelectedType('open-finance')}
              className={`border-2 rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                selectedType === 'open-finance'
                  ? 'border-flight-blue bg-flight-blue/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedType === 'open-finance' ? 'bg-flight-blue' : 'bg-gray-100'
                }`}>
                  <Link2 className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    selectedType === 'open-finance' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    Open Finance
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                    Sincronização automática via Open Finance do Banco Central. 
                    Conecte seu banco e suas transações são importadas automaticamente.
                  </p>
                  <div className="mt-2 sm:mt-3 flex items-start gap-2 text-xs text-gray-500">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-snug">Conexão segura e regulamentada pelo Banco Central</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedType === 'open-finance'
                    ? 'border-flight-blue bg-flight-blue'
                    : 'border-gray-300'
                }`}>
                  {selectedType === 'open-finance' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </div>

            {/* Opção Manual */}
            <div 
              onClick={() => setSelectedType('manual')}
              className={`border-2 rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${
                selectedType === 'manual'
                  ? 'border-flight-blue bg-flight-blue/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedType === 'manual' ? 'bg-flight-blue' : 'bg-gray-100'
                }`}>
                  <Edit3 className={`w-5 h-5 sm:w-6 sm:h-6 ${
                    selectedType === 'manual' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    Conta Manual
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                    Controle total manual. Você adiciona o saldo inicial e 
                    registra suas movimentações manualmente.
                  </p>
                  <div className="mt-2 sm:mt-3 text-xs text-gray-500">
                    <span className="leading-snug">Ideal para contas que não suportam Open Finance</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedType === 'manual'
                    ? 'border-flight-blue bg-flight-blue'
                    : 'border-gray-300'
                }`}>
                  {selectedType === 'manual' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Padrão da aplicação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-5 md:p-6 border-t border-gray-200 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            className="w-full sm:w-auto px-6 py-2 min-h-[44px] bg-flight-blue hover:bg-flight-blue/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}

