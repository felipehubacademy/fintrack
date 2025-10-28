import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrganization } from '../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import HelpTooltip from './ui/HelpTooltip';

export default function ExpenseModal({ isOpen, onClose, onSuccess, categories = [] }) {
  
  const { organization, user: orgUser, costCenters, isSoloUser, loading: orgLoading, budgetCategories } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();
  
  // Filtrar apenas categorias do tipo expense (ou both)
  const expenseCategories = useMemo(() => {
    const filtered = budgetCategories?.filter(cat => 
      cat.type === 'expense' || cat.type === 'both'
    ) || [];
    
    // Se recebeu categories via prop, usar elas
    if (categories.length > 0) return categories;
    return filtered;
  }, [budgetCategories, categories]);
  
  const [cards, setCards] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category_id: '',
    owner_name: '',
    payment_method: 'cash',
    card_id: '',
    installments: 1,
  });

  const [splitDetails, setSplitDetails] = useState([]);
  const [showSplitConfig, setShowSplitConfig] = useState(false);

  const isCredit = form.payment_method === 'credit_card';
  // Verificar se é compartilhado: se owner_name for o nome da organização
  const isShared = form.owner_name === (organization?.name || 'Organização');

  useEffect(() => {
    if (!isOpen) return;
    // Load cards for org
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
    
    // Se for usuário solo, auto-selecionar o próprio cost center
    if (isSoloUser && orgUser && !form.owner_name) {
      const userCostCenter = costCenters.find(cc => cc.user_id === orgUser.id);
      if (userCostCenter) {
        setForm(prev => ({ ...prev, owner_name: userCostCenter.name }));
      }
    }
  }, [isOpen, organization, isSoloUser, orgUser, costCenters]);

  // Quando selecionar organização, garantir que splits estão configurados
  useEffect(() => {
    if (isShared && splitDetails.length === 0 && costCenters && costCenters.length > 0) {
      // Inicializar splits automaticamente quando selecionar organização
      const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false && cc.user_id);
      if (activeCenters.length > 0) {
        const defaultSplits = activeCenters.map(cc => ({
          cost_center_id: cc.id,
          name: cc.name,
          color: cc.color,
          percentage: parseFloat(cc.default_split_percentage || 0),
          amount: 0
        }));
        setSplitDetails(defaultSplits);
        console.log('🔍 [EXPENSE MODAL] Organização selecionada, splits inicializados:', defaultSplits.length);
      }
    }
  }, [form.owner_name, organization?.name, costCenters, isShared]);

  const ownerOptions = useMemo(() => {
    // Todos os cost centers (não há mais distinção de "type")
    const allCenters = (costCenters || [])
      .filter(cc => cc.is_active !== false) // Apenas ativos
      .map(cc => ({ 
        id: cc.id, 
        name: cc.name, 
        default_split_percentage: cc.default_split_percentage, 
        color: cc.color,
        user_id: cc.user_id,
        linked_email: cc.linked_email
      }));
    
    // Adicionar nome da organização como opção especial APENAS para contas familiares
    if (!isSoloUser) {
      allCenters.push({
        id: null,
        name: organization?.name || 'Organização',
        default_split_percentage: 0,
        color: '#8B5CF6',
        isShared: true
      });
    }
    
    return allCenters;
  }, [costCenters, organization, isSoloUser]);

  // Inicializar divisão quando "Compartilhado" for selecionado
  useEffect(() => {
    if (isShared && splitDetails.length === 0) {
      // Buscar apenas cost_centers individuais (que têm user_id)
      // Ignorar cost centers "compartilhados" fictícios
      const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false && cc.user_id);
      console.log('🔍 [EXPENSE MODAL] Active centers:', activeCenters);
      console.log('🔍 [EXPENSE MODAL] Default split percentages:', activeCenters.map(cc => ({ name: cc.name, percentage: cc.default_split_percentage })));
      
      const defaultSplits = activeCenters.map(cc => ({
        cost_center_id: cc.id,
        name: cc.name,
        color: cc.color,
        percentage: parseFloat(cc.default_split_percentage || 0),
        amount: 0
      }));
      
      console.log('🔍 [EXPENSE MODAL] Default splits created:', defaultSplits);
      setSplitDetails(defaultSplits);
    } else if (!isShared) {
      // Limpar splits se não for compartilhado
      setSplitDetails([]);
      setShowSplitConfig(false);
    }
  }, [isShared, costCenters]);

  // Recalcular valores quando amount ou percentuais mudarem
  useEffect(() => {
    if (isShared && form.amount && splitDetails.length > 0) {
      const totalAmount = parseFloat(form.amount) || 0;
      console.log('🔍 [EXPENSE MODAL] Recalculating splits for amount:', totalAmount);
      console.log('🔍 [EXPENSE MODAL] Current splitDetails before recalculation:', splitDetails);
      
      const updatedSplits = splitDetails.map(split => ({
        ...split,
        amount: (totalAmount * split.percentage) / 100
      }));
      
      console.log('🔍 [EXPENSE MODAL] Updated splitDetails after recalculation:', updatedSplits);
      setSplitDetails(updatedSplits);
    }
  }, [form.amount, isShared, splitDetails.length]);

  // Recriar splitDetails quando showSplitConfig muda para true
  useEffect(() => {
    if (isShared && showSplitConfig && splitDetails.length === 0) {
      const totalAmount = parseFloat(form.amount) || 0;
      const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false && cc.user_id);
      const defaultSplits = activeCenters.map(cc => ({
        cost_center_id: cc.id,
        name: cc.name,
        color: cc.color,
        percentage: parseFloat(cc.default_split_percentage || 0),
        amount: (totalAmount * parseFloat(cc.default_split_percentage || 0)) / 100
      }));
      
      setSplitDetails(defaultSplits);
    }
  }, [isShared, showSplitConfig, costCenters, form.amount]);

  // Calcular total de percentuais
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
    const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false && cc.user_id);
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

    // Recalcular isShared antes de salvar (pode ter mudado)
    const willBeShared = form.owner_name === (organization?.name || 'Organização');
    
    // Validar splits se for compartilhado
    if (willBeShared && splitDetails.length === 0) {
      warning('É necessário configurar a divisão da despesa compartilhada');
      return;
    }
    
    if (willBeShared && totalPercentage !== 100) {
      warning(`A divisão deve somar exatamente 100%. Atual: ${totalPercentage}%`);
      return;
    }
    
    setSaving(true);
    
    try {
      // Resolve IDs by selections
      const selectedOption = ownerOptions.find(o => o.name === form.owner_name);
      const category = categories.find(c => c.id === form.category_id);
      
      if (!selectedOption) {
        throw new Error('Responsável inválido');
      }
      
      // Para despesa compartilhada (nome da organização), cost_center_id é NULL
      const isOptionShared = selectedOption.isShared || willBeShared;
      const costCenter = isOptionShared ? null : selectedOption;
      
      console.log('💾 [EXPENSE MODAL] Salvando despesa:', {
        owner_name: form.owner_name,
        organization_name: organization?.name,
        willBeShared,
        isOptionShared,
        cost_center_id: costCenter?.id || null,
        splitDetails_count: splitDetails.length
      });

      if (isCredit) {
        if (!form.card_id || !form.installments) throw new Error('Cartão e parcelas são obrigatórios');
        
        // Para a RPC, enviar "Compartilhado" se for compartilhado (a função detecta isso)
        // Mas salvar o nome da org no owner depois
        const ownerForRPC = willBeShared ? 'Compartilhado' : form.owner_name;
        
        // Call create_installments RPC
        const { data: parentExpenseId, error } = await supabase.rpc('create_installments', {
          p_amount: Number(form.amount),
          p_installments: Number(form.installments),
          p_description: form.description,
          p_date: form.date,
          p_card_id: form.card_id,
          p_category_id: category?.id || null,
          p_cost_center_id: costCenter?.id || null, // NULL para compartilhado
          p_owner: ownerForRPC, // "Compartilhado" para despesa compartilhada
          p_organization_id: organization.id,
          p_user_id: orgUser.id,
          p_whatsapp_message_id: null
        });
        if (error) throw error;
        
        // Atualizar o owner para o nome da organização após criar parcelas
        if (willBeShared && ownerForRPC !== form.owner_name) {
          const { error: updateError } = await supabase
            .from('expenses')
            .update({ 
              owner: form.owner_name,
              is_shared: true 
            })
            .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
          
          if (updateError) {
            console.error('⚠️ Erro ao atualizar owner das parcelas:', updateError);
            // Não falhar por causa disso, já que is_shared já está correto
          }
        }

        console.log('✅ [EXPENSE MODAL] Installments created, parent_expense_id:', parentExpenseId);

        // Se for compartilhado, salvar splits para a despesa principal
        if (willBeShared && splitDetails.length > 0) {
          console.log('🔍 [EXPENSE MODAL] Saving splits for credit card expense:', splitDetails);
          const splitsToInsert = splitDetails.map(split => ({
            expense_id: parentExpenseId,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));
          console.log('🔍 [EXPENSE MODAL] Splits to insert:', splitsToInsert);

          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) {
            throw splitError;
          }
          
          console.log('✅ [EXPENSE MODAL] Splits saved successfully');
        }
      } else {
        // Insert single expense
        const insertData = {
          organization_id: organization.id,
          user_id: orgUser.id,
          cost_center_id: costCenter?.id || null, // NULL para compartilhado
          owner: form.owner_name,
          is_shared: willBeShared, // Usar willBeShared calculado acima
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
        
        console.log('💾 [EXPENSE MODAL] Inserting expense:', insertData);
        
        const { data: expense, error } = await supabase
          .from('expenses')
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;

        console.log('✅ [EXPENSE MODAL] Expense saved:', expense);

        // Se for compartilhado, sempre salvar splits (padrão ou personalizado)
        if (willBeShared && splitDetails.length > 0) {
          console.log('🔍 [EXPENSE MODAL] Saving splits for non-credit expense:', splitDetails);
          const splitsToInsert = splitDetails.map(split => ({
            expense_id: expense.id,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));
          console.log('🔍 [EXPENSE MODAL] Splits to insert:', splitsToInsert);

          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) {
            throw splitError;
          }
        }
      }
      onClose?.();
      success('Despesa salva com sucesso!');
      onSuccess?.();
    } catch (e) {
      showError('Erro ao salvar despesa: ' + (e.message || 'Erro desconhecido'));
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
          <h2 className="text-gray-900 font-semibold text-lg">Nova Despesa</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  placeholder="Ex: Mercado, Farmácia"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="">Selecione...</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {!isSoloUser && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">Responsável *</label>
                    <HelpTooltip 
                      content={`Individual: só você vê. ${organization?.name || 'Organização'}: todos da família veem`}
                      autoOpen={true}
                    />
                  </div>
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
              )}

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
            </div>

            {/* Configuração de Divisão (Despesa Compartilhada) */}
            {isShared && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Divisão da Despesa</h4>
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


