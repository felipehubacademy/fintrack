import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useOrganization } from '../hooks/useOrganization';
import { useNotificationContext } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import {
  getBrazilTodayString,
  handleCurrencyChange,
  parseCurrencyInput,
  formatCurrencyInput
} from '../lib/utils';

const MAX_INSTALLMENTS = 24;

const createEmptyTransaction = () => ({
  date: getBrazilTodayString(),
  description: '',
  category_id: '',
  responsibility: '',
  amount: '',
  installments: 1
});

export default function CardBulkTransactionsModal({ isOpen, onClose, card, onSuccess }) {
  const { organization, user: orgUser, costCenters, budgetCategories, isSoloUser } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();

  const [transactions, setTransactions] = useState([createEmptyTransaction()]);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTransactions([createEmptyTransaction()]);
      setShowValidation(false);
    }
  }, [isOpen, card?.id]);

  useEffect(() => {
    if (!isOpen) return;
    setTransactions((current) => {
      if (current.length) return current;
      return [createEmptyTransaction()];
    });
  }, [isOpen]);

  const expenseCategories = useMemo(() => {
    return (budgetCategories || []).filter(
      (cat) => cat.type === 'expense' || cat.type === 'both'
    );
  }, [budgetCategories]);

  const ownerOptions = useMemo(() => {
    const options = (costCenters || [])
      .filter((cc) => cc?.is_active !== false)
      .map((cc) => ({
        value: cc.id,
        label: cc.name,
        type: 'cost_center',
        reference: cc
      }));

    if (organization && !isSoloUser) {
      options.push({
        value: 'shared',
        label: organization?.name || 'Família',
        type: 'shared',
        reference: null
      });
    }

    return options;
  }, [costCenters, organization, isSoloUser]);

  const handleFieldChange = (index, field, value) => {
    setTransactions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleAmountChange = (index, event) => {
    handleCurrencyChange(event, (value) => {
      setTransactions((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          amount: value
        };
        return updated;
      });
    });
  };

  const addTransactionRow = () => {
    setTransactions((prev) => [...prev, createEmptyTransaction()]);
  };

  const removeTransactionRow = (index) => {
    setTransactions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const isTransactionValid = (transaction) => {
    const amount = parseCurrencyInput(transaction.amount);
    return Boolean(
      transaction.date &&
      transaction.description.trim() &&
      transaction.category_id &&
      transaction.responsibility &&
      amount > 0
    );
  };

  const allValid = transactions.length > 0 && transactions.every(isTransactionValid);

  const composePayload = () => {
    return transactions.map((tx) => {
      const rawDescription = tx.description.trim();
      const normalizedDescription = rawDescription
        ? rawDescription.charAt(0).toUpperCase() + rawDescription.slice(1)
        : '';

      const selectedResponsibility = ownerOptions.find((opt) => opt.value === tx.responsibility);
      const amount = parseCurrencyInput(tx.amount);
      const installments = Number(tx.installments) || 1;

      let ownerName = '';
      let costCenterId = null;
      let isShared = false;

      if (selectedResponsibility?.type === 'cost_center') {
        ownerName = selectedResponsibility.label;
        costCenterId = selectedResponsibility.reference?.id || null;
      } else if (selectedResponsibility?.type === 'shared') {
        ownerName = organization?.name || 'Família';
        isShared = true;
      }

      return {
        date: tx.date,
        description: normalizedDescription,
        category_id: tx.category_id,
        owner_name: ownerName,
        cost_center_id: costCenterId,
        is_shared: isShared,
        amount,
        installments
      };
    });
  };

  const handleSave = async () => {
    setShowValidation(true);

    if (!card || !organization || !orgUser) {
      warning('Informações do cartão ou organização não encontradas.');
      return;
    }

    if (!allValid) {
      warning('Preencha todos os campos antes de salvar.');
      return;
    }

    const payload = composePayload();

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('create_bulk_card_expenses', {
        p_card_id: card.id,
        p_organization_id: organization.id,
        p_user_id: orgUser.id,
        p_transactions: payload
      });

      if (error) {
        throw error;
      }

      success('Transações adicionadas com sucesso!');
      onClose?.();
      onSuccess?.();
    } catch (err) {
      console.error('❌ [CardBulkTransactionsModal] Erro ao salvar transações:', err);
      const message = err?.message || err?.details || 'Erro desconhecido ao salvar transações em massa.';
      showError(`Erro ao salvar transações: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl border border-flight-blue/20 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-flight-blue/5 rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Transações em Massa</h2>
            {card && (
              <p className="text-sm text-gray-600 mt-1">
                Cartão: <span className="font-medium">{card.name}</span>
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="hidden lg:grid grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_minmax(180px,2fr)_minmax(160px,2fr)_minmax(120px,1fr)_minmax(140px,1fr)_48px] gap-3 text-xs font-semibold uppercase text-gray-500 tracking-wide">
            <span>Data</span>
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Responsabilidade</span>
            <span>Parcelas</span>
            <span>Valor</span>
            <span className="text-center">Remover</span>
          </div>

          <div className="space-y-4">
            {transactions.map((transaction, index) => {
              const isValid = isTransactionValid(transaction);
              const showInvalidState = showValidation && !isValid;

              return (
                <div
                  key={`transaction-row-${index}`}
                  className={`rounded-lg border ${showInvalidState ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} p-4 transition-colors`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_minmax(180px,2fr)_minmax(160px,2fr)_minmax(120px,1fr)_minmax(140px,1fr)_48px] gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        value={transaction.date}
                        onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.date ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Descrição
                      </label>
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                        placeholder="Ex: Compra no supermercado"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.description.trim() ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Categoria
                      </label>
                      <select
                        value={transaction.category_id}
                        onChange={(e) => handleFieldChange(index, 'category_id', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.category_id ? 'border-red-300' : 'border-gray-300'}`}
                      >
                        <option value="">Selecione uma categoria</option>
                        {expenseCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Responsabilidade
                      </label>
                      <select
                        value={transaction.responsibility}
                        onChange={(e) => handleFieldChange(index, 'responsibility', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.responsibility ? 'border-red-300' : 'border-gray-300'}`}
                      >
                        <option value="">Selecione</option>
                        {ownerOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Parcelas
                      </label>
                      <select
                        value={transaction.installments}
                        onChange={(e) => handleFieldChange(index, 'installments', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      >
                        {Array.from({ length: MAX_INSTALLMENTS }, (_, idx) => idx + 1).map((opt) => (
                          <option key={`installment-${opt}`} value={opt}>
                            {opt} {opt === 1 ? 'parcela' : 'parcelas'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Valor
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={transaction.amount}
                        onChange={(e) => handleAmountChange(index, e)}
                        onBlur={(e) => {
                          const parsed = parseCurrencyInput(e.target.value);
                          handleFieldChange(index, 'amount', parsed ? formatCurrencyInput(parsed) : '');
                        }}
                        placeholder="R$ 0,00"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && parseCurrencyInput(transaction.amount) <= 0 ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>

                    <div className="flex items-end justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTransactionRow(index)}
                        disabled={transactions.length === 1}
                        className="text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
                        aria-label="Remover transação"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {showInvalidState && (
                    <p className="mt-3 text-sm text-red-600">
                      Preencha todos os campos obrigatórios para esta transação.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={addTransactionRow}
              className="border-dashed border-2 border-flight-blue text-flight-blue hover:bg-flight-blue/5"
              aria-label="Adicionar nova transação"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-flight-blue hover:bg-flight-blue/90 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSaving || !allValid}
          >
            {isSaving ? 'Salvando...' : 'Salvar transações'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}


