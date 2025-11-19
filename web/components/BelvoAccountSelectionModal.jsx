import { useState } from 'react';
import { X, CheckCircle, Circle, CreditCard, Wallet } from 'lucide-react';
import { Button } from './ui/Button';

export default function BelvoAccountSelectionModal({ 
  isOpen, 
  onClose, 
  accounts = [],
  onConfirm
}) {
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  if (!isOpen) return null;

  const toggleAccount = (accountId) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedAccounts);
    onClose();
  };

  const getAccountTypeLabel = (category, type) => {
    const categoryMap = {
      'CHECKING_ACCOUNT': 'Conta Corrente',
      'SAVINGS_ACCOUNT': 'Conta Poupança',
      'PENSION_FUND_ACCOUNT': 'Previdência Privada',
      'LOAN_ACCOUNT': 'Empréstimo',
      'INVESTMENT_ACCOUNT': 'Investimento',
      'CREDIT_CARD': 'Cartão de Crédito'
    };
    return categoryMap[category] || type || 'Conta';
  };

  const formatBalance = (balance) => {
    if (!balance) return 'R$ 0,00';
    const amount = balance.current || balance.available || 0;
    return `R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
              Selecione as contas
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Escolha quais contas e cartões deseja adicionar ao MeuAzulão
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto flex-1">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhuma conta disponível para seleção.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const isSelected = selectedAccounts.includes(account.id);
                const isCreditCard = account.category === 'CREDIT_CARD';
                const Icon = isCreditCard ? CreditCard : Wallet;
                
                return (
                  <div
                    key={account.id}
                    onClick={() => toggleAccount(account.id)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-flight-blue bg-flight-blue/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-flight-blue' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {account.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                          {getAccountTypeLabel(account.category, account.type)}
                        </p>
                        {account.balance && (
                          <p className="text-xs sm:text-sm font-medium text-flight-blue mt-1">
                            {formatBalance(account.balance)}
                          </p>
                        )}
                        {isCreditCard && account.credit_data?.credit_limit && (
                          <p className="text-xs text-gray-500 mt-1">
                            Limite: R$ {parseFloat(account.credit_data.credit_limit).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-flight-blue bg-flight-blue'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 md:p-6 border-t border-gray-200 flex-shrink-0">
          <p className="text-sm text-gray-600">
            {selectedAccounts.length} {selectedAccounts.length === 1 ? 'conta selecionada' : 'contas selecionadas'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2 min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedAccounts.length === 0}
              className="w-full sm:w-auto px-6 py-2 min-h-[44px] bg-flight-blue hover:bg-flight-blue/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar ({selectedAccounts.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

