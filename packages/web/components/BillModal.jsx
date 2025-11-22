import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import ConfirmationModal from './ConfirmationModal';
import { X, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getBrazilToday, createBrazilDate, handleCurrencyChange, parseCurrencyInput, formatCurrencyInput } from '../lib/utils';

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' }
];

// Valores aceitos no banco conforme schema
const VALID_PAYMENT_METHODS = ['credit_card', 'debit_card', 'pix', 'cash', 'other', 'boleto', 'bank_transfer'];

const RECURRENCE_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' }
];

export default function BillModal({ isOpen, onClose, onSave, editingBill = null, costCenters = [], categories = [], cards = [], organization = null, user = null }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: '',
    category_id: '',
    cost_center_id: '',
    is_shared: false,
    is_recurring: false,
    recurrence_frequency: 'monthly',
    payment_method: '',
    card_id: '',
    status: 'pending'
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const isSoloUser = organization?.type === 'solo';

  const userCostCenter = useMemo(() => {
    if (!isSoloUser || !user) return null;
    return (
      costCenters.find(
        (cc) => cc.user_id === user.id && cc.is_active !== false
      ) || costCenters.find((cc) => cc.is_active !== false) || null
    );
  }, [isSoloUser, user, costCenters]);

  useEffect(() => {
    if (editingBill) {
      // Usar o status atual da bill
      let status = editingBill.status || 'pending';
      
      // Se não tiver status definido, determinar baseado na due_date
      if (!editingBill.status) {
        // Usar fuso horário do Brasil para comparação
        const dueDate = createBrazilDate(editingBill.due_date);
        const today = getBrazilToday();
        const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        if (dueDateNormalized < today) {
          status = 'overdue';
        } else {
          status = 'pending';
        }
      }
      
      setFormData({
        description: editingBill.description || '',
        amount: editingBill.amount ? formatCurrencyInput(editingBill.amount) : '',
        due_date: editingBill.due_date || '',
        category_id: editingBill.category_id || '',
        cost_center_id: isSoloUser && userCostCenter ? (editingBill.cost_center_id || userCostCenter.id) : (editingBill.cost_center_id || ''),
        is_shared: isSoloUser ? false : (editingBill.is_shared || false),
        is_recurring: editingBill.is_recurring || false,
        recurrence_frequency: editingBill.recurrence_frequency || 'monthly',
        payment_method: editingBill.payment_method || '',
        card_id: editingBill.card_id || '',
        status: status
      });
      setShowRevertModal(false);
      setPendingStatusChange(null);
    } else {
      resetForm();
    }
  }, [editingBill, isOpen, isSoloUser, userCostCenter]);

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      due_date: '',
      category_id: '',
      cost_center_id: isSoloUser && userCostCenter ? userCostCenter.id : '',
      is_shared: false,
      is_recurring: false,
      recurrence_frequency: 'monthly',
      payment_method: '',
      card_id: '',
      status: 'pending'
    });
    setErrors({});
    setShowRevertModal(false);
    setPendingStatusChange(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.amount || parseCurrencyInput(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Validar payment_method se fornecido
      let paymentMethod = formData.payment_method;
      
      // Se for string vazia, tratar como null
      if (paymentMethod === '' || !paymentMethod) {
        paymentMethod = null;
      } else if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        console.warn('⚠️ Payment method inválido:', paymentMethod);
        paymentMethod = null;
      }
      
      // Se payment_method for credit_card mas não tiver card_id, limpar card_id
      if (paymentMethod === 'credit_card' && !formData.card_id) {
        console.warn('⚠️ Cartão de crédito selecionado sem cartão específico');
      }
      
      console.log('🔍 [BILLMODAL] paymentMethod final:', paymentMethod);
      
      const isShared = isSoloUser ? false : formData.is_shared;
      const costCenterId = isSoloUser
        ? userCostCenter?.id || null
        : isShared
          ? null
          : (formData.cost_center_id || null);

      const billData = {
        description: formData.description.trim(),
        amount: parseCurrencyInput(formData.amount),
        due_date: formData.due_date,
        category_id: formData.category_id || null,
        cost_center_id: costCenterId,
        is_shared: isShared,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null
      };

      // Não incluir status aqui - deixar handleUpdateBill determinar baseado na due_date
      // Isso garante que o status seja sempre atualizado corretamente quando a data muda
      
      // Adicionar payment_method apenas se tiver valor válido (não incluir se for null)
      if (paymentMethod && VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        billData.payment_method = paymentMethod;
        // Adicionar card_id apenas se for cartão de crédito
        if (paymentMethod === 'credit_card' && formData.card_id) {
          billData.card_id = formData.card_id;
        }
      } else if (paymentMethod) {
        // Se paymentMethod foi fornecido mas não está na lista válida, logar erro
        console.error('❌ [BILLMODAL] Payment method inválido não será incluído:', paymentMethod);
        console.log('✅ [BILLMODAL] Métodos válidos:', VALID_PAYMENT_METHODS);
      }
      
      console.log('🔍 [BILLMODAL] billData antes de enviar:', billData);

      // Se estiver editando uma bill paga e o status foi alterado para pendente
      if (editingBill && editingBill.status === 'paid' && formData.status === 'pending') {
        billData.revert_to_pending = true;
        billData.expense_id = editingBill.expense_id; // Passar expense_id para exclusão
        
        // O sistema determinará automaticamente se é "overdue" baseado na due_date
        // Não precisamos definir isso aqui, será feito no handleUpdateBill
      }

      // Não definir status aqui - deixar handleUpdateBill determinar baseado na due_date
      // Isso garante que o status seja sempre atualizado corretamente quando a data muda

      await onSave(billData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      // Exibir mensagem de erro mais detalhada
      let errorMessage = 'Erro desconhecido ao salvar conta.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Limpar mensagens de erro internas que não devem ser exibidas ao usuário
      if (errorMessage.includes('showError is not a function')) {
        errorMessage = 'Erro ao salvar conta. Verifique os dados e tente novamente.';
      }
      
      setErrors({ submit: `Erro ao salvar conta: ${errorMessage}` });
      // Não fechar o modal em caso de erro para que o usuário possa tentar novamente
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    // Se estiver alterando o status de uma bill paga para pendente
    if (field === 'status' && editingBill && editingBill.status === 'paid' && value === 'pending') {
      setPendingStatusChange(value);
      setShowRevertModal(true);
      return; // Não atualizar ainda, aguardar confirmação
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleConfirmRevert = () => {
    if (pendingStatusChange) {
      setFormData(prev => ({ ...prev, status: pendingStatusChange }));
      setPendingStatusChange(null);
      setShowRevertModal(false);
    }
  };

  const handleCancelRevert = () => {
    setPendingStatusChange(null);
    setShowRevertModal(false);
    // Reverter para o status original da bill
    if (editingBill) {
      const originalStatus = editingBill.status || 'pending';
      setFormData(prev => ({ ...prev, status: originalStatus }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">
            {editingBill ? 'Editar Conta' : 'Nova Conta a Pagar'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Ex: Aluguel, Conta de Luz..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Valor e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={formData.amount}
                      onChange={(e) => handleCurrencyChange(e, (value) => handleChange('amount', value))}
                      onBlur={(e) => {
                        // Garantir formatação completa ao sair do campo
                        const value = e.target.value.trim();
                        if (!value) {
                          handleChange('amount', '');
                          return;
                        }
                        const parsed = parseCurrencyInput(value);
                        if (parsed > 0) {
                          const formatted = parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          handleChange('amount', formatted);
                        } else {
                          handleChange('amount', '');
                        }
                      }}
                      placeholder="0,00"
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                        errors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleChange('due_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue ${
                      errors.due_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.due_date && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.due_date}
                    </p>
                  )}
                </div>
              </div>

              {/* Categoria e Centro de Custo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category_id || ''}
                    onChange={(e) => handleChange('category_id', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>Carregando categorias...</option>
                    )}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Nenhuma categoria encontrada. Verifique se há categorias cadastradas.
                    </p>
                  )}
                </div>

                {!isSoloUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center space-x-2">
                        <span>Responsável</span>
                        {formData.is_shared && (
                          <div className="relative group">
                            <AlertCircle className="h-4 w-4 text-red-500 cursor-help" />
                            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duração-200 pointer-events-none z-10 w-64">
                              <div className="text-left">
                                <div className="font-medium text-gray-900">Conta Compartilhada</div>
                                <div className="text-gray-600 mt-1 leading-relaxed">
                                  Será dividida entre todos os responsáveis financeiros conforme suas porcentagens padrão.
                                </div>
                              </div>
                              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                    <div className="space-y-2">
                      <select
                        value={formData.is_shared ? 'shared' : formData.cost_center_id}
                        onChange={(e) => {
                          if (e.target.value === 'shared') {
                            handleChange('is_shared', true);
                            handleChange('cost_center_id', '');
                          } else {
                            handleChange('is_shared', false);
                            handleChange('cost_center_id', e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      >
                        <option value="">Selecione...</option>
                        <option value="shared">
                          {organization && organization.name ? organization.name : 'Família'}
                        </option>
                        {costCenters.map(cc => (
                          <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Status (apenas ao editar) */}
              {editingBill && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status === 'overdue' ? 'pending' : formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Paga</option>
                  </select>
                </div>
              )}

              {/* Recorrência */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => handleChange('is_recurring', e.target.checked)}
                    className="rounded border-gray-300 text-flight-blue focus:ring-flight-blue"
                  />
                  <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">
                    Conta Recorrente
                  </label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequência
                    </label>
                    <select
                      value={formData.recurrence_frequency}
                      onChange={(e) => handleChange('recurrence_frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    >
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      A próxima conta será criada automaticamente após o pagamento
                    </p>
                  </div>
                )}
              </div>

              {/* Método de Pagamento (Opcional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pagamento (Opcional)
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => handleChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                {formData.payment_method === 'credit_card' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cartão
                    </label>
                    <select
                      value={formData.card_id}
                      onChange={(e) => handleChange('card_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      disabled={cards.length === 0}
                    >
                      <option value="">Selecione...</option>
                      {cards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.name} - {card.bank}
                        </option>
                      ))}
                    </select>
                    {cards.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        Nenhum cartão de crédito cadastrado. Cadastre um cartão primeiro.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {errors.submit}
                  </p>
                </div>
              )}

            </form>
        </div>
        
        {/* Footer fixo */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px]"
          >
            {loading ? 'Salvando...' : editingBill ? 'Atualizar' : 'Criar Conta'}
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação para Reverter Status */}
      <ConfirmationModal
        isOpen={showRevertModal}
        onClose={handleCancelRevert}
        onConfirm={handleConfirmRevert}
        title="Confirmar reversão de status"
        message="Ao reverter esta conta para Pendente, a despesa criada quando ela foi marcada como paga será excluída permanentemente. Esta ação não pode ser desfeita."
        confirmText="Confirmar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

