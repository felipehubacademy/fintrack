import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrganization } from '../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, Users, User } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function TransactionModal({ isOpen, onClose, onSuccess, editingTransaction = null, categories = [] }) {
  const { organization, user: orgUser, costCenters, incomeCategories, loading: orgLoading } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();
  
  const [cards, setCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');

  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category_id: '',
    category: '', // Para incomes
    owner_name: '',
    payment_method: 'cash',
    card_id: '',
    installments: 1,
  });

  const [splitDetails, setSplitDetails] = useState([]);
  const [showSplitConfig, setShowSplitConfig] = useState(false);

  const isCredit = form.payment_method === 'credit_card';
  const isShared = form.owner_name === 'Compartilhado';

  useEffect(() => {
    if (editingTransaction) {
      setTransactionType(editingTransaction.type || 'expense');
      if (editingTransaction.type === 'income') {
        setForm({
          description: editingTransaction.description || '',
          amount: editingTransaction.amount?.toString() || '',
          date: editingTransaction.date || new Date().toISOString().slice(0, 10),
          category: editingTransaction.category || '',
          owner_name: editingTransaction.is_shared ? 'Compartilhado' : (editingTransaction.cost_center?.name || ''),
          category_id: '',
          payment_method: editingTransaction.payment_method || 'cash',
          card_id: '',
          installments: 1,
        });
        if (editingTransaction.income_splits) {
          setSplitDetails(editingTransaction.income_splits);
          setShowSplitConfig(true);
        }
      } else {
        setForm({
          description: editingTransaction.description || '',
          amount: editingTransaction.amount?.toString() || '',
          date: editingTransaction.date || new Date().toISOString().slice(0, 10),
          category_id: editingTransaction.category_id || '',
          owner_name: editingTransaction.owner || '',
          payment_method: editingTransaction.payment_method || 'cash',
          card_id: editingTransaction.card_id || '',
          installments: editingTransaction.installments || 1,
          category: '',
        });
        if (editingTransaction.expense_splits) {
          setSplitDetails(editingTransaction.expense_splits);
          setShowSplitConfig(true);
        }
      }
    } else {
      resetForm();
    }
  }, [editingTransaction, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      if (organization?.id && organization.id !== 'default-org') {
        const { data: cardsData } = await supabase
          .from('cards')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name');
        setCards(cardsData || []);
      } else {
        setCards([]);
      }
    };
    load();
  }, [isOpen, organization]);

  const ownerOptions = useMemo(() => {
    const allCenters = (costCenters || [])
      .filter(cc => cc.is_active !== false)
      .map(cc => ({ 
        id: cc.id, 
        name: cc.name, 
        default_split_percentage: cc.default_split_percentage, 
        color: cc.color,
        user_id: cc.user_id,
        linked_email: cc.linked_email
      }));
    
    allCenters.push({
      id: null,
      name: 'Compartilhado',
      default_split_percentage: 0,
      color: '#8B5CF6',
      isShared: true
    });
    
    return allCenters;
  }, [costCenters]);

  useEffect(() => {
    if (isShared && splitDetails.length === 0) {
      const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false);
      const defaultSplits = activeCenters.map(cc => ({
        cost_center_id: cc.id,
        name: cc.name,
        color: cc.color,
        percentage: parseFloat(cc.default_split_percentage || 0),
        amount: 0
      }));
      setSplitDetails(defaultSplits);
    } else if (!isShared) {
      setSplitDetails([]);
      setShowSplitConfig(false);
    }
  }, [isShared, costCenters]);

  useEffect(() => {
    if (isShared && form.amount && splitDetails.length > 0) {
      const totalAmount = parseFloat(form.amount) || 0;
      const updatedSplits = splitDetails.map(split => ({
        ...split,
        amount: (totalAmount * split.percentage) / 100
      }));
      setSplitDetails(updatedSplits);
    }
  }, [form.amount, isShared, splitDetails.length]);

  const totalPercentage = useMemo(() => {
    return splitDetails.reduce((sum, split) => sum + (parseFloat(split.percentage) || 0), 0);
  }, [splitDetails]);

  const updateSplitPercentage = (index, newPercentage) => {
    const totalAmount = parseFloat(form.amount) || 0;
    setSplitDetails(prev => prev.map((split, i) => 
      i === index 
        ? { 
            ...split, 
            percentage: newPercentage,
            amount: (totalAmount * newPercentage) / 100
          }
        : split
    ));
  };

  const resetToDefaultSplit = () => {
    const totalAmount = parseFloat(form.amount) || 0;
    const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false);
    const defaultSplits = activeCenters.map(cc => ({
      cost_center_id: cc.id,
      name: cc.name,
      color: cc.color,
      percentage: parseFloat(cc.default_split_percentage || 0),
      amount: (totalAmount * parseFloat(cc.default_split_percentage || 0)) / 100
    }));
    setSplitDetails(defaultSplits);
    setShowSplitConfig(false);
  };

  const resetForm = () => {
    setForm({
      description: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      category_id: '',
      category: '',
      owner_name: '',
      payment_method: 'cash',
      card_id: '',
      installments: 1,
    });
    setSplitDetails([]);
    setShowSplitConfig(false);
    setTransactionType('expense');
  };

  const handleSave = async () => {
    if (!organization?.id || !orgUser?.id) {
      showError('Organização ou usuário não encontrados');
      return;
    }
    if (!form.description || !form.amount || !form.date) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }
    if (!form.owner_name) {
      warning('Selecione um responsável');
      return;
    }

    if (isShared && totalPercentage !== 100) {
      warning(`A divisão deve somar exatamente 100%. Atual: ${totalPercentage}%`);
      return;
    }
    
    setSaving(true);
    
    try {
      if (transactionType === 'income') {
        // Salvar como entrada
        const selectedOption = ownerOptions.find(o => o.name === form.owner_name);
        const costCenter = selectedOption.isShared ? null : selectedOption;

        let income;
        let error;

        if (editingTransaction) {
          // Editar entrada existente
          const { data, error: updateError } = await supabase
            .from('incomes')
            .update({
              description: form.description,
              amount: parseFloat(form.amount),
              date: form.date,
              category: form.category || null,
              payment_method: form.payment_method,
              cost_center_id: form.is_shared ? null : costCenter?.id,
              is_shared: form.is_shared,
              status: 'confirmed'
            })
            .eq('id', editingTransaction.id)
            .select()
            .single();
          
          income = data;
          error = updateError;
        } else {
          // Criar nova entrada
          const { data, error: insertError } = await supabase
            .from('incomes')
            .insert({
              description: form.description,
              amount: parseFloat(form.amount),
              date: form.date,
              category: form.category || null,
              payment_method: form.payment_method,
              cost_center_id: form.is_shared ? null : costCenter?.id,
              is_shared: form.is_shared,
              organization_id: organization.id,
              user_id: orgUser.id,
              status: 'confirmed'
            })
            .select()
            .single();
          
          income = data;
          error = insertError;
        }

        if (error) throw error;

        if (isShared && splitDetails.length > 0) {
          // Se está editando, deletar splits antigos primeiro
          if (editingTransaction) {
            const { error: deleteError } = await supabase
              .from('income_splits')
              .delete()
              .eq('income_id', editingTransaction.id);
            
            if (deleteError) throw deleteError;
          }

          const splitsToInsert = splitDetails.map(split => ({
            income_id: income.id,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));

          const { error: splitError } = await supabase
            .from('income_splits')
            .insert(splitsToInsert);

          if (splitError) throw splitError;
        }
      } else {
        // Salvar como despesa (lógica existente)
        const selectedOption = ownerOptions.find(o => o.name === form.owner_name);
        const category = categories.find(c => c.id === form.category_id);
        
        if (!selectedOption) {
          throw new Error('Responsável inválido');
        }
        
        const costCenter = selectedOption.isShared ? null : selectedOption;

        if (isCredit) {
          if (!form.card_id || !form.installments) throw new Error('Cartão e parcelas são obrigatórios');
          
          const { data: parentExpenseId, error } = await supabase.rpc('create_installments', {
            p_amount: Number(form.amount),
            p_installments: Number(form.installments),
            p_description: form.description,
            p_date: form.date,
            p_card_id: form.card_id,
            p_category_id: category?.id || null,
            p_cost_center_id: costCenter?.id || null,
            p_owner: form.owner_name,
            p_organization_id: organization.id,
            p_user_id: orgUser.id,
            p_whatsapp_message_id: null
          });
          if (error) throw error;

          if (isShared && splitDetails.length > 0) {
            const splitsToInsert = splitDetails.map(split => ({
              expense_id: parentExpenseId,
              cost_center_id: split.cost_center_id,
              percentage: split.percentage,
              amount: split.amount
            }));

            const { error: splitError } = await supabase
              .from('expense_splits')
              .insert(splitsToInsert);

            if (splitError) throw splitError;
          }
        } else {
          const dataToSave = {
            cost_center_id: costCenter?.id || null,
            owner: form.owner_name,
            split: isShared,
            category_id: category?.id || null,
            category: category?.name || null,
            amount: Number(form.amount),
            description: form.description,
            date: form.date,
            payment_method: form.payment_method,
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            confirmed_by: orgUser.id,
            source: 'manual'
          };

          let expense;
          let error;

          if (editingTransaction) {
            // Editar despesa existente
            const { data, error: updateError } = await supabase
              .from('expenses')
              .update(dataToSave)
              .eq('id', editingTransaction.id)
              .select()
              .single();
            
            expense = data;
            error = updateError;
          } else {
            // Criar nova despesa
            const insertData = {
              ...dataToSave,
              organization_id: organization.id,
              user_id: orgUser.id,
            };
            
            const { data, error: insertError } = await supabase
              .from('expenses')
              .insert(insertData)
              .select()
              .single();
            
            expense = data;
            error = insertError;
          }
          
          if (error) throw error;

          if (isShared && splitDetails.length > 0) {
            // Se está editando, deletar splits antigos primeiro
            if (editingTransaction) {
              const { error: deleteError } = await supabase
                .from('expense_splits')
                .delete()
                .eq('expense_id', editingTransaction.id);
              
              if (deleteError) throw deleteError;
            }

            const splitsToInsert = splitDetails.map(split => ({
              expense_id: expense.id,
              cost_center_id: split.cost_center_id,
              percentage: split.percentage,
              amount: split.amount
            }));

            const { error: splitError } = await supabase
              .from('expense_splits')
              .insert(splitsToInsert);

            if (splitError) throw splitError;
          }
        }
      }
      
      onClose?.();
      const action = editingTransaction ? 'atualizada' : 'salva';
      success(transactionType === 'income' ? `Entrada ${action} com sucesso!` : `Despesa ${action} com sucesso!`);
      onSuccess?.();
    } catch (e) {
      showError('Erro ao salvar: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">
            {editingTransaction ? 'Editar' : 'Nova'} {transactionType === 'income' ? 'Entrada' : 'Despesa'}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {/* Toggle de tipo */}
          {!editingTransaction && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Transação</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType('expense')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    transactionType === 'expense'
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">Despesa</div>
                  <div className="text-xs text-gray-500 mt-1">Gastos e pagamentos</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('income')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    transactionType === 'income'
                      ? 'border-flight-blue bg-flight-blue/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-medium text-flight-blue">Entrada</div>
                  <div className="text-xs text-gray-500 mt-1">Receitas e ganhos</div>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                placeholder={transactionType === 'income' ? 'Ex: Salário, Freelance, Venda' : 'Ex: Mercado, Farmácia'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
              />
            </div>

            {/* Categoria - mudar baseado no tipo */}
            {transactionType === 'income' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {incomeCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Recebimento</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="deposit">Depósito</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="boleto">Boleto</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option>
                    <option value="bank_transfer">Transferência Bancária</option>
                    <option value="other">Outros</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
              <select
                value={form.owner_name}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
              >
                <option value="">Selecione...</option>
                {ownerOptions.map(o => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Campos específicos de despesa */}
            {transactionType === 'expense' && (
              <>
                {isCredit && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cartão *</label>
                      <select
                        value={form.card_id}
                        onChange={(e) => setForm({ ...form, card_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      >
                        <option value="">Selecione...</option>
                        {cards.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas *</label>
                      <select
                        value={form.installments}
                        onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i+1} value={i+1}>{i+1}x</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Configuração de Divisão */}
          {isShared && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Divisão</h4>
                <button
                  type="button"
                  onClick={() => showSplitConfig ? resetToDefaultSplit() : setShowSplitConfig(true)}
                  className="text-sm text-flight-blue hover:text-flight-blue/80 font-medium"
                >
                  {showSplitConfig ? 'Usar Padrão' : 'Personalizar'}
                </button>
              </div>

              {showSplitConfig ? (
                <div className="space-y-3">
                  {splitDetails.map((split, index) => (
                    <div key={split.cost_center_id} className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: split.color }}
                      />
                      <span className="flex-1 text-sm font-medium text-gray-700">{split.name}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={split.percentage}
                          onChange={(e) => updateSplitPercentage(index, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                        />
                        <span className="text-sm text-gray-500 w-6">%</span>
                        <span className="text-sm text-gray-600 w-24 text-right">
                          R$ {split.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t border-gray-300 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total:</span>
                    <span className={`text-sm font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {totalPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {splitDetails.map((split) => (
                    <div key={split.cost_center_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: split.color }}
                        />
                        <span className="text-gray-700">{split.name}</span>
                      </div>
                      <span className="text-gray-600 font-medium">
                        {split.percentage}% (R$ {split.amount.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer fixo */}
        <div className="flex justify-end space-x-3 p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

