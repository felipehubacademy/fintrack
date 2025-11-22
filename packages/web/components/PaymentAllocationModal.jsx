import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { getBrazilTodayString, handleCurrencyChange, parseCurrencyInput, formatCurrencyInput } from '../lib/utils';

export default function PaymentAllocationModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  organization,
  costCenters = [],
  currentUser
}) {
  const { success, error: showError } = useNotificationContext();
  const [saving, setSaving] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  const [form, setForm] = useState({
    amount: '',
    date: getBrazilTodayString(),
    description: '',
    owner_name: '',
    ownership_type: 'member', // 'member' ou 'organization'
    cost_center_id: '',
    allocation_target: 'individual', // 'individual' ou 'shared'
    bank_account_id: ''
  });

  // Estado para splits quando ownership_type = 'organization'
  const [splitDetails, setSplitDetails] = useState([]);

  useEffect(() => {
    if (isOpen && organization?.id) {
      // Buscar contas bancárias
      const fetchBankAccounts = async () => {
        const { data, error } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name');
        
        if (!error && data) {
          setBankAccounts(data);
        }
      };
      
      fetchBankAccounts();
      
      // Reset form ao abrir
      const userCostCenter = costCenters.find(cc => cc.user_id === currentUser?.id && cc.is_active !== false);
      
      setForm({
        amount: '',
        date: getBrazilTodayString(),
        description: '',
        owner_name: userCostCenter?.name || '',
        ownership_type: 'member',
        cost_center_id: userCostCenter?.id || '',
        allocation_target: 'individual',
        bank_account_id: ''
      });
      
      // Inicializar splits com base nos cost centers ativos
      initializeSplits();
    }
  }, [isOpen, costCenters, currentUser, organization]);

  const initializeSplits = () => {
    const activeIndividualCenters = costCenters.filter(cc => !cc.is_shared && cc.is_active !== false);
    
    const splits = activeIndividualCenters.map(cc => ({
      cost_center_id: cc.id,
      cost_center_name: cc.name,
      percentage: parseFloat(cc.default_split_percentage || 0),
      amount: 0
    }));
    
    setSplitDetails(splits);
  };

  const ownerOptions = useMemo(() => {
    const allCenters = (costCenters || [])
      .filter((cc) => !cc.is_shared && cc.is_active !== false)
      .map((cc) => ({
        id: cc.id,
        name: cc.name,
        type: 'member',
        cost_center_id: cc.id
      }));

    allCenters.push({
      id: null,
      name: organization?.name || 'Organização',
      type: 'organization',
      cost_center_id: null
    });

    return allCenters;
  }, [costCenters, organization]);

  const handleOwnerChange = (selectedName) => {
    const selected = ownerOptions.find(o => o.name === selectedName);
    if (!selected) return;

    setForm(prev => ({
      ...prev,
      owner_name: selectedName,
      ownership_type: selected.type,
      cost_center_id: selected.cost_center_id || '',
      allocation_target: selected.type === 'organization' ? 'shared' : prev.allocation_target
    }));
  };

  const calculateSplitAmounts = (totalAmount) => {
    return splitDetails.map(split => ({
      ...split,
      amount: (totalAmount * split.percentage) / 100
    }));
  };

  const handleSave = async () => {
    // Validações
    if (!form.amount || parseCurrencyInput(form.amount) <= 0) {
      showError('Informe um valor válido para o aporte');
      return;
    }

    if (!form.bank_account_id) {
      showError('Selecione a conta de origem');
      return;
    }

    if (form.ownership_type === 'member' && !form.cost_center_id) {
      showError('Selecione quem está aportando');
      return;
    }

    if (form.ownership_type === 'organization') {
      const totalPercentage = splitDetails.reduce((sum, split) => sum + parseFloat(split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        showError('A soma dos percentuais deve ser 100%');
        return;
      }
    }

    try {
      setSaving(true);

      const amount = parseCurrencyInput(form.amount);
      const monthReference = form.date.substring(0, 7); // 'YYYY-MM'

      // 1. Criar payment_allocation
      const allocationData = {
        amount,
        date: form.date,
        description: form.description?.trim() || null,
        allocation_target: form.allocation_target,
        ownership_type: form.ownership_type,
        cost_center_id: form.ownership_type === 'member' ? form.cost_center_id : null,
        bank_account_id: form.bank_account_id,
        month_reference: monthReference,
        organization_id: organization.id,
        user_id: currentUser.id
      };

      const { data: allocation, error: allocationError } = await supabase
        .from('payment_allocations')
        .insert(allocationData)
        .select()
        .single();

      if (allocationError) throw allocationError;

      console.log('✅ Aporte criado:', allocation.id);

      // 2. Se for organization, criar splits
      if (form.ownership_type === 'organization') {
        const splitsWithAmounts = calculateSplitAmounts(amount);
        const splitsToInsert = splitsWithAmounts
          .filter(split => split.percentage > 0)
          .map(split => ({
            payment_allocation_id: allocation.id,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));

        if (splitsToInsert.length > 0) {
          const { error: splitsError } = await supabase
            .from('payment_allocation_splits')
            .insert(splitsToInsert);

          if (splitsError) throw splitsError;
          
          console.log('✅ Splits criados:', splitsToInsert.length);
        }
      }

      // 3. Criar transação bancária (debitar da conta)
      const transactionDescription = form.description?.trim() 
        || `Aporte para ${form.allocation_target === 'individual' ? 'despesas individuais' : 'despesas compartilhadas'}`;

      const { error: transactionError } = await supabase.rpc('create_bank_transaction', {
        p_bank_account_id: form.bank_account_id,
        p_transaction_type: 'manual_debit', // Debitar da conta
        p_amount: amount,
        p_description: transactionDescription,
        p_date: form.date,
        p_organization_id: organization.id,
        p_user_id: currentUser.id,
        p_expense_id: null,
        p_bill_id: null,
        p_income_id: null,
        p_related_account_id: null
      });

      if (transactionError) throw transactionError;

      console.log('✅ Transação bancária criada');

      success('Aporte registrado com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao registrar aporte:', error);
      showError(error.message || 'Erro ao registrar aporte');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">
            Registrar Aporte
          </h2>
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
            
            {/* Valor do Aporte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Aporte *
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

            {/* Quem está aportando */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quem está aportando? *
              </label>
              <select
                value={form.owner_name}
                onChange={(e) => handleOwnerChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              >
                <option value="">Selecione...</option>
                {ownerOptions.map(o => (
                  <option key={o.id ?? o.name} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Destinar para */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinar para *
              </label>
              <select
                value={form.allocation_target}
                onChange={(e) => setForm(prev => ({ ...prev, allocation_target: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              >
                {form.ownership_type === 'member' ? (
                  <>
                    <option value="individual">Despesas Individuais</option>
                    <option value="shared">Despesas Compartilhadas</option>
                  </>
                ) : (
                  <option value="shared">Despesas Compartilhadas</option>
                )}
              </select>
            </div>

            {/* Conta de Origem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta de Origem *
              </label>
              <select
                value={form.bank_account_id}
                onChange={(e) => setForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              >
                <option value="">Selecione a conta</option>
                {bankAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Aporte mensal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                disabled={saving}
              />
            </div>

          </div>

          {/* Preview do Impacto (se ownership = organization) */}
          {form.ownership_type === 'organization' && form.amount && parseCurrencyInput(form.amount) > 0 && (
            <div className="bg-flight-blue/5 border border-flight-blue/20 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Divisão do Aporte
              </h4>
              <div className="space-y-2">
                {calculateSplitAmounts(parseCurrencyInput(form.amount)).map((split) => (
                  split.percentage > 0 && (
                    <div key={split.cost_center_id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{split.cost_center_name}</span>
                      <span className="font-medium text-gray-900">
                        {split.percentage.toFixed(1)}% = R$ {split.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

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
            {saving ? 'Registrando...' : 'Registrar Aporte'}
          </Button>
        </div>
      </div>
    </div>
  );
}

