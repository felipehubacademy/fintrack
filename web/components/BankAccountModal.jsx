import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { X, AlertCircle } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function BankAccountModal({ isOpen, onClose, account, costCenters = [], organizationId, onSuccess }) {
  const { success, error: showError, warning } = useNotificationContext();
  const [formData, setFormData] = useState({
    name: '',
    bank: '',
    account_type: 'checking',
    account_number: '',
    initial_balance: '',
    owner_type: 'individual',
    cost_center_id: ''
  });
  
  const [shares, setShares] = useState([]);
  const [showShares, setShowShares] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCenters, setActiveCenters] = useState([]);

  useEffect(() => {
    // Filtrar apenas cost centers ativos e não compartilhados
    setActiveCenters(costCenters.filter(cc => cc.is_active !== false && !cc.is_shared));
  }, [costCenters]);

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        bank: account.bank || '',
        account_type: account.account_type || 'checking',
        account_number: account.account_number || '',
        initial_balance: account.initial_balance || '',
        owner_type: account.owner_type || 'individual',
        cost_center_id: account.cost_center_id || ''
      });
      setShowShares(account.owner_type === 'shared');
    } else {
      resetForm();
    }
  }, [account]);

  useEffect(() => {
    if (showShares && activeCenters.length > 0 && shares.length === 0) {
      // Inicializar shares com porcentagens padrão
      const defaultShares = activeCenters.map(cc => ({
        cost_center_id: cc.id,
        cost_center_name: cc.name,
        percentage: cc.default_split_percentage || (100 / activeCenters.length)
      }));
      setShares(defaultShares);
    }
  }, [showShares, activeCenters]);

  const resetForm = () => {
    setFormData({
      name: '',
      bank: '',
      account_type: 'checking',
      account_number: '',
      initial_balance: '',
      owner_type: 'individual',
      cost_center_id: ''
    });
    setShares([]);
    setShowShares(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'owner_type') {
      setShowShares(value === 'shared');
      if (value === 'individual') {
        setShares([]);
      }
    }
  };

  const handleShareChange = (index, percentage) => {
    const newShares = [...shares];
    newShares[index].percentage = parseFloat(percentage) || 0;
    setShares(newShares);
  };

  const totalPercentage = shares.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.bank || !formData.initial_balance) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.owner_type === 'individual' && !formData.cost_center_id) {
      warning('Selecione um responsável para conta individual');
      return;
    }

    if (formData.owner_type === 'shared' && totalPercentage !== 100) {
      warning(`A soma das porcentagens deve ser 100%. Atual: ${totalPercentage}%`);
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (!organizationId) throw new Error('Organização não encontrada');

      const accountData = {
        name: formData.name,
        bank: formData.bank,
        account_type: formData.account_type,
        account_number: formData.account_number || null,
        initial_balance: parseFloat(formData.initial_balance),
        current_balance: parseFloat(formData.initial_balance),
        owner_type: formData.owner_type,
        cost_center_id: formData.owner_type === 'individual' ? formData.cost_center_id : null,
        organization_id: organizationId,
        user_id: user.id
      };

      let accountId;
      
      if (account) {
        // Editar conta existente
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', account.id);
        
        if (error) throw error;
        accountId = account.id;
      } else {
        // Criar nova conta
        const { data, error } = await supabase
          .from('bank_accounts')
          .insert(accountData)
          .select()
          .single();
        
        if (error) throw error;
        accountId = data.id;
      }

      // Salvar shares se for compartilhada
      if (formData.owner_type === 'shared' && shares.length > 0) {
        // Deletar shares existentes
        await supabase
          .from('bank_account_shares')
          .delete()
          .eq('bank_account_id', accountId);

        // Inserir novos shares
        const sharesToInsert = shares.map(s => ({
          bank_account_id: accountId,
          cost_center_id: s.cost_center_id,
          percentage: s.percentage
        }));

        const { error: sharesError } = await supabase
          .from('bank_account_shares')
          .insert(sharesToInsert);

        if (sharesError) throw sharesError;
      }

      resetForm();
      success(account ? 'Conta bancária atualizada com sucesso!' : 'Conta bancária criada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      showError('Erro ao salvar conta bancária: ' + (error.message || 'Erro desconhecido'));
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
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl pr-2">
            {account ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Conteúdo com scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
          <div className="space-y-4 md:space-y-6 pt-4">
            {/* Grid para Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Nome da Conta */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Conta *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Nubank Corrente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>

              {/* Banco */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco *
                </label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => handleChange('bank', e.target.value)}
                  placeholder="Ex: Nubank, Itaú, Bradesco"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>

              {/* Tipo de Conta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Conta *
                </label>
                <select
                  value={formData.account_type}
                  onChange={(e) => handleChange('account_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Poupança</option>
                </select>
              </div>

              {/* Número da Conta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número da Conta (opcional)
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => handleChange('account_number', e.target.value)}
                  placeholder="Últimos dígitos (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
              </div>

              {/* Saldo Inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saldo Inicial (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => handleChange('initial_balance', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>
            </div>

            {/* Tipo de Propriedade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Propriedade *
              </label>
              <select
                value={formData.owner_type}
                onChange={(e) => handleChange('owner_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                required
              >
                <option value="individual">Individual</option>
                <option value="shared">Compartilhada</option>
              </select>
            </div>

            {/* Responsável (Individual) */}
            {formData.owner_type === 'individual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsável *
                </label>
                <select
                  value={formData.cost_center_id}
                  onChange={(e) => handleChange('cost_center_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                >
                  <option value="">Selecione...</option>
                  {activeCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Shares (Compartilhada) */}
            {showShares && shares.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Participação por Responsável *
                  </label>
                  <span className={`text-sm font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {totalPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="space-y-2">
                  {shares.map((share, index) => (
                    <div key={share.cost_center_id} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 w-32 truncate">{share.cost_center_name}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={share.percentage}
                        onChange={(e) => handleShareChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      />
                      <span className="text-sm text-gray-500 w-8">%</span>
                    </div>
                  ))}
                </div>
                {totalPercentage !== 100 && (
                  <div className="mt-3 flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>A soma deve ser exatamente 100%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer fixo */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || (totalPercentage !== 100 && formData.owner_type === 'shared')}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px]"
          >
            {saving ? 'Salvando...' : (account ? 'Atualizar' : 'Criar Conta')}
          </Button>
        </div>
      </div>
    </div>
  );
}

