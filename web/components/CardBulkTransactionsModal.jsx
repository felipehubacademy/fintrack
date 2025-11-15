import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Upload } from 'lucide-react';
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
import FileUploadButton from './FileUploadButton';
import { useFileUpload } from '../hooks/useFileUpload';

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
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [loadingDots, setLoadingDots] = useState(1);
  
  const { file, setFile, uploading, progress, error: uploadError, uploadFile, reset: resetUpload } = useFileUpload();

  const userCostCenter = useMemo(() => {
    if (!costCenters || !orgUser) return null;
    return (
      costCenters.find(
        (cc) => cc.user_id === orgUser.id && cc.is_active !== false
      ) || null
    );
  }, [costCenters, orgUser]);

  useEffect(() => {
    if (isOpen) {
      setTransactions([createEmptyTransaction()]);
      setShowValidation(false);
      setShowUploadSection(false);
      resetUpload();
    }
  }, [isOpen, card?.id]);

  useEffect(() => {
    if (!uploading) {
      setLoadingDots(1);
      return;
    }
    const timer = setInterval(() => {
      setLoadingDots((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(timer);
  }, [uploading]);

  useEffect(() => {
    if (!isOpen) return;
    setTransactions((current) => {
      if (current.length) return current;
      return [createEmptyTransaction()];
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isSoloUser || !userCostCenter) return;
    setTransactions((prev) =>
      prev.map((tx) =>
        tx.responsibility === userCostCenter.id
          ? tx
          : { ...tx, responsibility: userCostCenter.id }
      )
    );
  }, [isSoloUser, userCostCenter, userCostCenter?.id, isOpen]);

  const expenseCategories = useMemo(() => {
    return (budgetCategories || []).filter(
      (cat) => cat.type === 'expense' || cat.type === 'both'
    );
  }, [budgetCategories]);

  const ownerOptions = useMemo(() => {
    if (isSoloUser) {
      return userCostCenter
        ? [
            {
              value: userCostCenter.id,
              label: userCostCenter.name,
              type: 'cost_center',
              reference: userCostCenter
            }
          ]
        : [];
    }

    const options = (costCenters || [])
      .filter((cc) => cc?.is_active !== false)
      .map((cc) => ({
        value: cc.id,
        label: cc.name,
        type: 'cost_center',
        reference: cc
      }));

    if (organization) {
      options.push({
        value: 'shared',
        label: organization?.name || 'Família',
        type: 'shared',
        reference: null
      });
    }

    return options;
  }, [costCenters, organization, isSoloUser, userCostCenter]);

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
    const hasResponsibility = isSoloUser ? true : Boolean(transaction.responsibility);
    return Boolean(
      transaction.date &&
      transaction.description.trim() &&
      transaction.category_id &&
      hasResponsibility &&
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
      } else if (isSoloUser && userCostCenter) {
        ownerName = userCostCenter.name;
        costCenterId = userCostCenter.id;
      }

      // Se for estorno ou pagamento parcial, garantir que amount seja negativo
      const finalAmount = (tx._isRefund || tx._isPartialPayment || tx._shouldBeNegative) 
        ? -Math.abs(amount) 
        : Math.abs(amount);

      return {
        date: tx.date,
        description: normalizedDescription,
        category_id: tx.category_id,
        owner_name: ownerName,
        cost_center_id: costCenterId,
        is_shared: isShared,
        amount: finalAmount,
        installments,
        is_partial_payment: tx._isPartialPayment || false
      };
    });
  };

  const handleFileSelect = async (selectedFile) => {
    if (!card || !organization) {
      warning('Informações do cartão ou organização não encontradas.');
      return;
    }

    setFile(selectedFile);
    
    const extractedTransactions = await uploadFile(selectedFile, card.id, organization.id);
    
    if (extractedTransactions && extractedTransactions.length > 0) {
      // Mapear transações extraídas para o formato do modal
      const mapped = extractedTransactions.map(tx => {
        // Encontrar categoria por ID ou por nome
        let categoryId = tx.category_id;
        if (!categoryId && tx.category_suggestion) {
          const matchedCategory = expenseCategories.find(
            cat => cat.name.toLowerCase() === tx.category_suggestion.toLowerCase()
          );
          categoryId = matchedCategory?.id || '';
        }

        // Converter valor para negativo se necessário
        let amount = tx.amount;
        if (tx._shouldBeNegative || tx.is_refund || tx.is_partial_payment) {
          amount = -Math.abs(amount);
        }

        return {
          date: tx.date || getBrazilTodayString(),
          description: tx.description || '',
          category_id: categoryId || '',
          responsibility: userCostCenter?.id || '',
          amount: formatCurrencyInput(Math.abs(amount)), // Sempre positivo no input
          installments: tx.installments || 1,
          _isRefund: tx.is_refund || false,
          _isPartialPayment: tx.is_partial_payment || false,
          _shouldBeNegative: tx._shouldBeNegative || false
        };
      });

      setTransactions(mapped);
      success(`${mapped.length} transações extraídas com sucesso!`);
      setShowUploadSection(false);
    } else if (uploadError) {
      showError(uploadError);
    }
  };

  const checkForDuplicates = async () => {
    if (!card || !organization || transactions.length === 0) return null;

    try {
      // Obter datas das transações
      const dates = transactions.map(tx => tx.date).filter(d => d);
      if (dates.length === 0) return null;

      // Encontrar mês/ano mais antigo e mais recente
      const sortedDates = dates.sort();
      const oldestDate = new Date(sortedDates[0]);
      const newestDate = new Date(sortedDates[sortedDates.length - 1]);

      const startOfMonth = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), 1)
        .toISOString().split('T')[0];
      const endOfMonth = new Date(newestDate.getFullYear(), newestDate.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // Buscar transações existentes no período
      const { data: existing, error } = await supabase
        .from('expenses')
        .select('id, date, description, amount')
        .eq('card_id', card.id)
        .eq('organization_id', organization.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (error) throw error;

      if (existing && existing.length > 0) {
        const monthYear = oldestDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return {
          count: existing.length,
          monthYear,
          cardName: card.name,
          startDate: startOfMonth,
          endDate: endOfMonth
        };
      }

      return null;
    } catch (err) {
      console.error('❌ Erro ao verificar duplicatas:', err);
      return null;
    }
  };

  const handleSave = async (replaceExisting = false) => {
    setShowValidation(true);

    if (!card || !organization || !orgUser) {
      warning('Informações do cartão ou organização não encontradas.');
      return;
    }

    if (!allValid) {
      warning('Preencha todos os campos antes de salvar.');
      return;
    }

    // Verificar duplicatas apenas se não for uma confirmação de substituição
    if (!replaceExisting && !duplicateInfo) {
      const duplicates = await checkForDuplicates();
      if (duplicates) {
        setDuplicateInfo(duplicates);
        setShowDuplicateModal(true);
        return;
      }
    }

    const payload = composePayload();

    setIsSaving(true);
    try {
      // Se for para substituir, cancelar transações existentes primeiro
      if (replaceExisting && duplicateInfo) {
        const { error: cancelError } = await supabase
          .from('expenses')
          .update({ status: 'cancelled' })
          .eq('card_id', card.id)
          .eq('organization_id', organization.id)
          .gte('date', duplicateInfo.startDate)
          .lte('date', duplicateInfo.endDate);

        if (cancelError) {
          console.error('❌ Erro ao cancelar transações:', cancelError);
          warning('Erro ao cancelar transações existentes. Prosseguindo com mesclagem.');
        }
      }

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
      setShowDuplicateModal(false);
      setDuplicateInfo(null);
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
        <div className="px-6 py-4 border-b border-gray-100 bg-flight-blue/5 rounded-t-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Transações em Massa</h2>
              {card && (
                <p className="text-sm text-gray-600 mt-1">
                  Cartão: <span className="font-medium">{card.name}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadSection(!showUploadSection)}
                className="text-flight-blue border-flight-blue hover:bg-flight-blue/5"
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {showUploadSection ? 'Cancelar Upload' : 'Upload de Arquivo'}
              </Button>
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
          </div>
          {/* Indicators */}
          {transactions.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-900">{transactions.length}</span>
                <span>transaç{transactions.length === 1 ? 'ão' : 'ões'}</span>
              </div>
              <div className="h-3 w-px bg-gray-300" />
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-900">
                  {(() => {
                    const total = transactions.reduce((sum, tx) => {
                      const amount = parseCurrencyInput(tx.amount);
                      if (tx._isRefund) return sum - amount;
                      return sum + amount;
                    }, 0);
                    return new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(total);
                  })()}
                </span>
                <span>total da fatura</span>
              </div>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Upload Section */}
          {showUploadSection && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Upload de Fatura/Extrato
              </h3>
              <FileUploadButton
                onFileSelect={handleFileSelect}
                disabled={isSaving}
                uploading={uploading}
                progress={progress}
              />
              {uploading && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <span className="font-mono animate-pulse">{'.'.repeat(loadingDots)}</span>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-600 mt-2">{uploadError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: PDF, CSV, Excel. As transações extraídas aparecerão abaixo para revisão antes de salvar.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {transactions.map((transaction, index) => {
              const isValid = isTransactionValid(transaction);
              const showInvalidState = showValidation && !isValid;
              const specialCategoryLock = transaction._isRefund || transaction._isPartialPayment;

              return (
                <div
                  key={`transaction-row-${index}`}
                  className={`rounded-lg border ${showInvalidState ? 'border-red-300 bg-red-50/40' : 'border-gray-200'} p-4 transition-colors`}
                >
                  <div className={`grid grid-cols-1 gap-3 ${
                    isSoloUser
                      ? 'lg:grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_minmax(180px,2fr)_minmax(120px,1fr)_minmax(140px,1fr)_48px]'
                      : 'lg:grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_minmax(180px,2fr)_minmax(160px,2fr)_minmax(120px,1fr)_minmax(140px,1fr)_48px]'
                  }`}>
                    <div>
                      <input
                        type="date"
                        value={transaction.date}
                        onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                        className={`w-full h-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.date ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        value={transaction.description}
                        onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                        placeholder="Ex: Compra no supermercado"
                        className={`w-full h-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.description.trim() ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>

                    <div>
                      <select
                        value={transaction.category_id}
                        onChange={(e) => handleFieldChange(index, 'category_id', e.target.value)}
                        disabled={specialCategoryLock}
                        className={`w-full h-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.category_id ? 'border-red-300' : 'border-gray-300'} ${specialCategoryLock ? 'bg-gray-100 text-gray-500' : ''}`}
                      >
                        <option value="">{specialCategoryLock ? 'Categoria automática' : 'Categoria'}</option>
                        {expenseCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isSoloUser && (
                      <div>
                        <select
                          value={transaction.responsibility}
                          onChange={(e) => handleFieldChange(index, 'responsibility', e.target.value)}
                          className={`w-full h-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && !transaction.responsibility ? 'border-red-300' : 'border-gray-300'}`}
                        >
                          <option value="">Responsável</option>
                          {ownerOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <select
                        value={transaction.installments}
                        onChange={(e) => handleFieldChange(index, 'installments', Number(e.target.value))}
                        className="w-full h-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      >
                        {Array.from({ length: MAX_INSTALLMENTS }, (_, idx) => idx + 1).map((opt) => (
                          <option key={`installment-${opt}`} value={opt}>
                            {opt} {opt === 1 ? 'parcela' : 'parcelas'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
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
                        className={`w-full h-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${showInvalidState && parseCurrencyInput(transaction.amount) <= 0 ? 'border-red-300' : 'border-gray-300'}`}
                      />
                    </div>

                    <div className="flex items-center justify-center">
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

      {/* Modal de Confirmação de Duplicatas */}
      {showDuplicateModal && duplicateInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Transações Existentes Detectadas
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Já existem <strong>{duplicateInfo.count} transações</strong> para o cartão{' '}
              <strong>{duplicateInfo.cardName}</strong> em <strong>{duplicateInfo.monthYear}</strong>.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              O que deseja fazer?
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setShowDuplicateModal(false);
                  handleSave(false);
                }}
                className="w-full bg-flight-blue hover:bg-flight-blue/90 text-white"
                disabled={isSaving}
              >
                ✅ Mesclar (adicionar às existentes)
              </Button>
              <Button
                onClick={() => {
                  setShowDuplicateModal(false);
                  handleSave(true);
                }}
                variant="outline"
                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                disabled={isSaving}
              >
                🔄 Substituir (cancelar existentes)
              </Button>
              <Button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicateInfo(null);
                }}
                variant="ghost"
                className="w-full"
                disabled={isSaving}
              >
                ❌ Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}


