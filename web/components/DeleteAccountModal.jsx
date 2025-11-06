import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/Button';

export default function DeleteAccountModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  loading = false
}) {
  const [confirmText, setConfirmText] = useState('');
  const requiredText = 'Deletar minha conta';
  const isConfirmed = confirmText.trim() === requiredText;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl w-full max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
              Excluir Conta Permanentemente
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Aviso Principal */}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-900 font-semibold mb-2">
                Esta ação é irreversível
              </p>
              <p className="text-red-800 text-sm">
                Ao excluir sua conta, <strong>todos os seus dados serão permanentemente removidos</strong> do sistema.
              </p>
              <p className="text-red-800 text-sm mt-3 font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </div>

            {/* Campo de Confirmação */}
            <div>
              <label htmlFor="confirm-delete" className="block text-sm font-medium text-gray-700 mb-2">
                Digite <span className="font-mono font-semibold text-gray-900">"{requiredText}"</span> para confirmar:
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requiredText}
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmText('');
                  onClose();
                }}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2 min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (isConfirmed) {
                    onConfirm();
                  }
                }}
                disabled={!isConfirmed || loading}
                className="w-full sm:w-auto px-6 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Excluindo...' : 'Excluir Conta Permanentemente'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

