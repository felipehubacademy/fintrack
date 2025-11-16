import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { getBrazilTodayString, handleCurrencyChange, parseCurrencyInput } from '../lib/utils';

export default function BankIncomeModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  organization,
  costCenters = [],
  incomeCategories = [],
  selectedAccount = null,
  currentUser
}) {
  const { success, error: showError } = useNotificationContext();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: getBrazilTodayString(),
    category_id: '',
    bank_account_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form ao abrir
      setForm({
        description: '',
        amount: '',
        date: getBrazilTodayString(),
        category_id: '',
        bank_account_id: selectedAccount?.id || ''
      });
    }
  }, [isOpen, selectedAccount]);

  const handleSave = async () => {
    // Validações
    if (!form.description?.trim()) {
      showError('Informe uma descrição');
      return;
    }

    if (!form.amount || parseCurrencyInput(form.amount) <= 0) {
      showError('Informe um valor válido');
      return;
    }

    if (!form.category_id) {
      showError('Selecione uma categoria');
      return;
    }

    if (!form.bank_account_id) {
      showError('Selecione a conta de destino');
      return;
    }

    try {
      setSaving(true);

      const amount = parseCurrencyInput(form.amount);

      // 1. Criar income
      const incomeData = {
        description: form.description.trim(),
        amount,
        date: form.date,
        category_id: form.category_id,
        is_shared: false,
        cost_center_id: costCenters.find(cc => cc.user_id === currentUser?.id && cc.is_active !== false)?.id || null,
        bank_account_id: form.bank_account_id,
        organization_id: organization.id,
        user_id: currentUser.id,
        status: 'confirmed',
        source: 'manual'
      };

      const { data: income, error: incomeError } = await supabase
        .from('incomes')
        .insert(incomeData)
        .select()
        .single();

      if (incomeError) throw incomeError;

      console.log('✅ Entrada criada:', income.id);

      // 2. Criar transação bancária (crédito na conta)
      const { error: transactionError } = await supabase.rpc('create_bank_transaction', {
        p_bank_account_id: form.bank_account_id,
        p_transaction_type: 'income_deposit',
        p_amount: amount,
        p_description: form.description.trim(),
        p_date: form.date,
        p_organization_id: organization.id,
        p_user_id: currentUser.id,
        p_expense_id: null,
        p_bill_id: null,
        p_income_id: income.id,
        p_related_account_id: null
      });

      if (transactionError) throw transactionError;

      console.log('✅ Transação bancária criada e saldo atualizado');

      success('Entrada registrada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao registrar entrada:', error);
      showError(error.message || 'Erro ao registrar entrada');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedCategory = incomeCategories.find(c => c.id === form.category_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">
              Registrar Entrada
            </h2>
            {selectedAccount && (
              <p className="text-sm text-gray-500 mt-1">{selectedAccount.name}</p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            
            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição *
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Salário Novembro, Freelance"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="text"
                  value={form.amount}
                  onChange={(e) => handleCurrencyChange(e, (value) => setForm(prev => ({ ...prev, amount: value })))}
                  onBlur={(e) => {
                    // Garantir formatação completa ao sair do campo
                    const value = e.target.value.trim();
                    if (!value) {
                      setForm(prev => ({ ...prev, amount: '' }));
                      return;
                    }
                    const parsed = parseCurrencyInput(value);
                    if (parsed > 0) {
                      const formatted = parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setForm(prev => ({ ...prev, amount: formatted }));
                    } else {
                      setForm(prev => ({ ...prev, amount: '' }));
                    }
                  }}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              >
                <option value="">Selecione...</option>
                {incomeCategories
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

        </div>

        {/* Footer com botões */}
        <div className="flex flex-row justify-end gap-3 p-4 sm:p-5 md:p-6 pt-4 border-t bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-flight-blue hover:bg-flight-blue/90 text-white px-4 py-2"
          >
            {saving ? 'Registrando...' : 'Registrar Entrada'}
          </Button>
        </div>
      </div>
    </div>
  );
}

