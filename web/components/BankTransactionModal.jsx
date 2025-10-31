import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { X, ArrowRight } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useOrganization } from '../hooks/useOrganization';

export default function BankTransactionModal({ isOpen, onClose, account, organizationId, onSuccess }) {
  const { organization } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();
  const [formData, setFormData] = useState({
    to_account_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    if (isOpen && organizationId) {
      fetchAvailableAccounts();
      resetForm();
    }
  }, [isOpen, organizationId, account]);

  const fetchAvailableAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, bank')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .neq('id', account?.id) // Excluir a conta origem
        .order('name');

      if (error) throw error;
      setAvailableAccounts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      showError('Erro ao buscar contas disponíveis');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const resetForm = () => {
    setFormData({
      to_account_id: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.to_account_id) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      warning('O valor deve ser maior que zero');
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (!organizationId) throw new Error('Organização não encontrada');

      // Chamar função RPC para transferência entre contas
      const { data, error } = await supabase.rpc('transfer_between_accounts', {
        p_from_account_id: account.id,
        p_to_account_id: formData.to_account_id,
        p_amount: parseFloat(formData.amount),
        p_description: formData.description || 'Transferência entre contas',
        p_date: formData.date,
        p_organization_id: organizationId,
        p_user_id: user.id
      });

      if (error) throw error;

      resetForm();
      success('Transferência realizada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao realizar transferência:', error);
      showError('Erro ao realizar transferência: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[95vh] sm:max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg pr-2">
            Transferir Entre Contas
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 pt-0">
          <div className="space-y-4 pt-4">
            {/* Conta de Origem */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta de Origem
              </label>
              <input
                type="text"
                value={`${account?.name} - ${account?.bank || ''}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            {/* Conta de Destino */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conta de Destino *
              </label>
              {loadingAccounts ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                  Carregando contas...
                </div>
              ) : availableAccounts.length === 0 ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm">
                  Nenhuma outra conta ativa disponível para transferência
                </div>
              ) : (
                <select
                  value={formData.to_account_id}
                  onChange={(e) => handleChange('to_account_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                >
                  <option value="">Selecione a conta de destino</option>
                  {availableAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} - {acc.bank || ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  required
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Ex: Transferência para investimento, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
              />
            </div>

            {/* Indicador Visual */}
            {formData.to_account_id && formData.amount && (
              <div className="flex items-center justify-center p-4 bg-flight-blue/5 rounded-lg border border-flight-blue/20">
                <div className="flex items-center space-x-3">
                  <div className="text-left">
                    <p className="text-xs text-gray-500">De</p>
                    <p className="font-medium text-gray-900">{account?.name}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-flight-blue" />
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Para</p>
                    <p className="font-medium text-gray-900">
                      {availableAccounts.find(a => a.id === formData.to_account_id)?.name || ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer fixo */}
        <div className="flex justify-end space-x-3 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || availableAccounts.length === 0}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            {saving ? 'Transferindo...' : 'Transferir'}
          </Button>
        </div>
      </div>
    </div>
  );
}

