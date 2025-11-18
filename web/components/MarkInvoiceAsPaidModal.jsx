import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
  processCurrencyInput,
  parseCurrencyInput,
  formatCurrencyInput
} from '../lib/utils';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function MarkInvoiceAsPaidModal({
  isOpen,
  onClose,
  onConfirm,
  invoice,
  card,
  organization = null
}) {
  const { error: showError } = useNotificationContext();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [rawAmount, setRawAmount] = useState(0);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invoiceTotal = useMemo(() => Number(invoice?.total || 0), [invoice?.total]);

  const normalizeCurrencyValue = (value) => {
    if (!value && value !== 0) return 0;
    return Number(Number(value).toFixed(2));
  };

  const isLessOrEqualWithTolerance = (value, limit, tolerance = 0.01) => {
    return value <= limit + tolerance;
  };

  useEffect(() => {
    if (isOpen && invoice) {
      // Formatar com R$ (ex: "9881.06" -> "R$ 9.881,06")
      const value = normalizeCurrencyValue(invoice?.total || 0);
      setRawAmount(value);
      setAmountInput(formatCurrencyInput(value));
    }
  }, [isOpen, invoice]);

  useEffect(() => {
    if (isOpen && organization?.id) {
      loadBankAccounts();
    }
  }, [isOpen, organization?.id]);

  const loadBankAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setFetchError(null);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, bank, account_type')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setBankAccounts(data || []);
      if (data?.length) {
        setSelectedAccount(data[0].id);
      } else {
        setSelectedAccount('');
      }
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
      setFetchError('Não foi possível carregar as contas bancárias. Tente novamente.');
      showError?.('Erro ao carregar contas bancárias');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return; // Prevenir cliques duplos
    
    const normalizedRaw = normalizeCurrencyValue(rawAmount);
    const normalizedTotal = normalizeCurrencyValue(invoiceTotal);

    if (!selectedAccount || normalizedRaw <= 0 || !isLessOrEqualWithTolerance(normalizedRaw, normalizedTotal)) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        bank_account_id: selectedAccount,
        amount: normalizedRaw
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invoice || !card) return null;

  const normalizedRawAmount = normalizeCurrencyValue(rawAmount);
  const normalizedInvoiceTotal = normalizeCurrencyValue(invoiceTotal);

  const isAmountValid =
    normalizedRawAmount > 0 && isLessOrEqualWithTolerance(normalizedRawAmount, normalizedInvoiceTotal);
  const canConfirm = !!selectedAccount && isAmountValid && !loadingAccounts && !isSubmitting;
  const remainingAfterPayment = Math.max(normalizedInvoiceTotal - normalizedRawAmount, 0);

  const formatCurrency = (value) => {
    if (Number.isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-flight-blue/20 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-flight-blue/10 bg-flight-blue/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-inner border border-flight-blue/20">
              <CreditCard className="w-5 h-5 text-flight-blue" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-flight-blue">
                Pagamento de fatura
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">
                Valor total da fatura
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(invoice.total)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Ao confirmar, uma transação bancária será criada e o limite do cartão será atualizado.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Valor a pagar agora
              </label>
              <div className="mt-2 relative">
                <input
                  type="text"
                  value={amountInput}
                  onChange={(e) => {
                    const processed = processCurrencyInput(e.target.value);
                    setAmountInput(processed);
                    setRawAmount(normalizeCurrencyValue(parseCurrencyInput(processed)));
                  }}
                  onFocus={() => {
                    setAmountInput(processCurrencyInput(amountInput));
                  }}
                  onBlur={() => {
                    if (normalizedRawAmount > 0) {
                      setAmountInput(formatCurrencyInput(normalizedRawAmount));
                    } else {
                      setAmountInput('');
                    }
                  }}
                  className={`w-full rounded-xl border px-4 py-2.5 font-semibold text-gray-900 focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    isAmountValid ? 'border-gray-300' : 'border-red-300'
                  }`}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                />
              </div>
              {!isAmountValid && (
                <p className="text-xs text-red-500 mt-1">
                  Informe um valor entre R$ 0,01 e {formatCurrency(invoice.total)}.
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                <span>Saldo restante após este pagamento</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(remainingAfterPayment)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Debitar da conta bancária
            </label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando contas ativas...
              </div>
            ) : bankAccounts.length > 0 ? (
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-flight-blue focus:border-flight-blue text-gray-900"
              >
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} • {account.bank}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {fetchError || 'Nenhuma conta bancária ativa encontrada. Cadastre uma conta para continuar.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto border-gray-300 text-gray-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando
              </span>
            ) : loadingAccounts ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando
              </span>
            ) : (
              'Confirmar pagamento'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
