import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrganization } from '../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import HelpTooltip from './ui/HelpTooltip';
import { getBrazilTodayString, handleCurrencyChange, parseCurrencyInput, formatCurrencyInput, appLocale } from '../lib/utils';
import { useI18n } from '../contexts/I18nContext';
import { formatMoney, currencySymbol } from '@fintrack/shared/i18n';
import { categoryName, dedupeCategories } from '../lib/categoryName';
import withPaywall from './billing/withPaywall';

// Helper: Agregar splits por cost_center_id para evitar duplicatas
const aggregateSplits = (splits) => {
  if (!splits || splits.length === 0) return [];
  
  const aggregated = Object.values(
    splits.reduce((acc, split) => {
      const id = split.cost_center_id;
      if (!id) return acc;
      if (!acc[id]) {
        acc[id] = {
          cost_center_id: id,
          name: split.name,
          color: split.color,
          percentage: 0,
          amount: 0
        };
      }
      acc[id].percentage += Number(split.percentage) || 0;
      acc[id].amount += Number(split.amount) || 0;
      return acc;
    }, {})
  );
  
  console.log('🔍 [aggregateSplits] Input:', splits.length, '→ Output:', aggregated.length);
  return aggregated;
};

function ExpenseModal({ isOpen, onClose, onSuccess, categories = [] }) {
  const { t } = useI18n();
  
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
    date: getBrazilTodayString(),
    category_id: '',
    owner_name: '',
    payment_method: 'cash',
    card_id: '',
    installments: 1,
  });

  const [splitDetails, setSplitDetails] = useState([]);
  const [showSplitConfig, setShowSplitConfig] = useState(false);

  const userCostCenter = useMemo(() => {
    if (!costCenters || !orgUser) return null;
    return (
      costCenters.find(
        (cc) => cc.user_id === orgUser.id && cc.is_active !== false
      ) || null
    );
  }, [costCenters, orgUser]);

  const isCredit = form.payment_method === 'credit_card';
  // Verificar se é compartilhado: se owner_name for o nome da organização
  const isShared = !isSoloUser && form.owner_name === (organization?.name || 'Organização');

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
    if (isSoloUser && userCostCenter && !form.owner_name) {
      setForm(prev => ({ ...prev, owner_name: userCostCenter.name }));
    }
  }, [isOpen, organization, isSoloUser, userCostCenter, form.owner_name]);

  useEffect(() => {
    if (!isSoloUser || !userCostCenter) return;
    setForm((prev) => {
      if (prev.owner_name === userCostCenter.name) {
        return prev;
      }
      return {
        ...prev,
        owner_name: userCostCenter.name || prev.owner_name
      };
    });
  }, [isSoloUser, userCostCenter, userCostCenter?.name, isOpen]);

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
    if (isSoloUser) {
      return userCostCenter
        ? [
            {
              id: userCostCenter.id,
              name: userCostCenter.name,
              default_split_percentage: userCostCenter.default_split_percentage,
              color: userCostCenter.color,
              user_id: userCostCenter.user_id,
              linked_email: userCostCenter.linked_email
            }
          ]
        : [];
    }

    const allCenters = (costCenters || [])
      .filter((cc) => cc.is_active !== false)
      .map((cc) => ({
        id: cc.id,
        name: cc.name,
        default_split_percentage: cc.default_split_percentage,
        color: cc.color,
        user_id: cc.user_id,
        linked_email: cc.linked_email
      }));

    allCenters.push({
      id: null,
      name: organization?.name || 'Organização',
      default_split_percentage: 0,
      color: '#8B5CF6',
      isShared: true
    });

    return allCenters;
  }, [costCenters, organization, isSoloUser, userCostCenter]);

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
      const totalAmount = parseCurrencyInput(form.amount) || 0;
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
      const totalAmount = parseCurrencyInput(form.amount) || 0;
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
      showError(t('web.expenseModal.householdOrUserNotFound'));
      return;
    }
    if (!form.description || !form.amount || !form.date) {
      warning(t('web.shared.fillInAllRequiredFields'));
      return;
    }
    if (!form.owner_name) {
      warning(t('web.expenseModal.pickAnOwner'));
      return;
    }

    // Recalcular isShared antes de salvar (pode ter mudado)
    const willBeShared = !isSoloUser && form.owner_name === (organization?.name || 'Organização');
    
    // Validar splits se for compartilhado
    if (willBeShared && splitDetails.length === 0) {
      warning(t('web.expenseModal.setUpHowTheShared'));
      return;
    }
    
    if (willBeShared && totalPercentage !== 100) {
      warning(t('web.expenseModal.theSplitMustAddUp', { totalPercentage }));
      return;
    }
    
    setSaving(true);
    
    try {
      // Resolve IDs by selections
      let selectedOption = ownerOptions.find(o => o.name === form.owner_name);
      if (!selectedOption && isSoloUser && userCostCenter) {
        selectedOption = {
          id: userCostCenter.id,
          name: userCostCenter.name
        };
      }
      const category = categories.find(c => c.id === form.category_id);
      
      if (!selectedOption) {
        throw new Error(t('web.expenseModal.invalidOwner'));
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
        if (!form.card_id || !form.installments) throw new Error(t('web.expenseModal.cardAndInstallmentsAreRequired'));
        
        // ⚠️ IMPORTANTE: Enviar o nome da organização (como o Zul faz)
        const ownerForRPC = form.owner_name;
        
        console.log('🔍 [EXPENSE MODAL] willBeShared:', willBeShared, 'splitDetails:', splitDetails.length);

        const { data: parentExpenseId, error } = await supabase.rpc('create_installments', {
          p_amount: parseCurrencyInput(form.amount),
          p_installments: Number(form.installments),
          p_description: form.description.trim(),
          p_date: form.date,
          p_card_id: form.card_id,
          p_category_id: category?.id || null,
          p_cost_center_id: costCenter?.id || null,
          p_owner: ownerForRPC, // Nome da organização (como o Zul)
          p_organization_id: organization.id,
          p_user_id: orgUser.id,
          p_whatsapp_message_id: null,
          p_split_template: null // ← NÃO enviar splits (como o Zul)
        });
        if (error) throw error;
        
        // Atualizar o owner para o nome da organização após criar parcelas
        if (willBeShared && ownerForRPC !== form.owner_name) {
          const { error: updateError } = await supabase
            .from('expenses')
            .update({ 
              owner: form.owner_name.trim(),
              is_shared: true 
            })
            .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
          
          if (updateError) {
            console.error('⚠️ Erro ao atualizar owner das parcelas:', updateError);
            // Não falhar por causa disso, já que is_shared já está correto
          }
        }

        console.log('✅ [EXPENSE MODAL] Installments created, parent_expense_id:', parentExpenseId);

        // Atualizar available_limit do cartão (decrementar o valor total da compra)
        if (form.card_id) {
          try {
            const { data: card } = await supabase
              .from('cards')
              .select('available_limit, credit_limit')
              .eq('id', form.card_id)
              .single();
            
            if (card) {
              const currentAvailable = parseFloat(card.available_limit || card.credit_limit || 0);
              const newAvailable = Math.max(0, currentAvailable - parseCurrencyInput(form.amount));
              
              await supabase
                .from('cards')
                .update({ available_limit: newAvailable })
                .eq('id', form.card_id);
              
              console.log('✅ [EXPENSE MODAL] Updated card available_limit:', newAvailable);
            }
          } catch (cardUpdateError) {
            console.error('⚠️ Erro ao atualizar limite disponível do cartão:', cardUpdateError);
            // Não falhar por causa disso
          }
        }

        // Inserir splits manualmente para TODAS as parcelas
        if (willBeShared && splitDetails.length > 0) {
          console.log('🔍 [EXPENSE MODAL] Inserindo splits para todas as parcelas...');
          
          // Buscar todas as parcelas criadas
          const { data: allInstallments, error: fetchError } = await supabase
            .from('expenses')
            .select('id')
            .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
          
          if (fetchError) throw fetchError;
          
          console.log('📊 [EXPENSE MODAL] Parcelas encontradas:', allInstallments.length);
          
          // Verificar e deletar splits existentes (trigger pode criar automaticamente)
          const installmentIds = allInstallments.map(i => i.id);
          const { data: existingSplits } = await supabase
            .from('expense_splits')
            .select('*')
            .in('expense_id', installmentIds);
          
          if (existingSplits && existingSplits.length > 0) {
            console.log('🗑️ [EXPENSE MODAL] Deletando', existingSplits.length, 'splits existentes das parcelas...');
            await supabase
              .from('expense_splits')
              .delete()
              .in('expense_id', installmentIds);
          }
          
          // Usar helper para garantir unicidade
          const uniqueSplits = aggregateSplits(splitDetails);
          
          console.log('📊 [EXPENSE MODAL] Splits únicos:', uniqueSplits.length);
          
          // Inserir splits para cada parcela
          const splitsToInsert = allInstallments.flatMap(installment => 
            uniqueSplits.map(split => ({
              expense_id: installment.id,
              cost_center_id: split.cost_center_id,
              percentage: split.percentage,
              amount: split.amount / Number(form.installments)
            }))
          );
          
          console.log('📊 [EXPENSE MODAL] Total de splits a inserir:', splitsToInsert.length);

          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) {
            console.error('❌ [EXPENSE MODAL] Erro ao inserir splits:', splitError);
            throw splitError;
          }
          
          console.log('✅ [EXPENSE MODAL] Splits inseridos com sucesso');
        }

      } else {
        // Insert single expense
        const insertData = {
          organization_id: organization.id,
          user_id: orgUser.id,
          cost_center_id: costCenter?.id || null, // NULL para compartilhado
          owner: form.owner_name.trim(),
          is_shared: willBeShared, // Usar willBeShared calculado acima
          category_id: category?.id || null,
          category: category?.name || null,
          amount: parseCurrencyInput(form.amount),
          description: form.description.trim(),
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

        // Atualizar available_limit do cartão se for crédito
        if (form.payment_method === 'credit_card' && expense.card_id) {
          try {
            const { data: card } = await supabase
              .from('cards')
              .select('available_limit, credit_limit')
              .eq('id', expense.card_id)
              .single();
            
            if (card) {
              const currentAvailable = parseFloat(card.available_limit || card.credit_limit || 0);
              const newAvailable = Math.max(0, currentAvailable - parseCurrencyInput(form.amount));
              
              await supabase
                .from('cards')
                .update({ available_limit: newAvailable })
                .eq('id', expense.card_id);
              
              console.log('✅ [EXPENSE MODAL] Updated card available_limit:', newAvailable);
            }
          } catch (cardUpdateError) {
            console.error('⚠️ Erro ao atualizar limite disponível do cartão:', cardUpdateError);
            // Não falhar por causa disso
          }
        }

        // Se for compartilhado, sempre salvar splits (padrão ou personalizado)
        if (willBeShared && splitDetails.length > 0) {
          console.log('🔍 [EXPENSE MODAL] Saving splits for non-credit expense:', splitDetails);
          
          // SEMPRE deletar splits existentes primeiro (pode haver trigger que cria automaticamente)
          const { data: existingSplits } = await supabase
            .from('expense_splits')
            .select('*')
            .eq('expense_id', expense.id);
          
          if (existingSplits && existingSplits.length > 0) {
            console.log('🗑️ [EXPENSE MODAL] Deletando', existingSplits.length, 'splits existentes...');
            await supabase
              .from('expense_splits')
              .delete()
              .eq('expense_id', expense.id);
          }
          
          // Garantir unicidade por cost_center_id antes de inserir
          const uniqueSplits = aggregateSplits(splitDetails);
          const splitsToInsert = uniqueSplits.map(split => ({
            expense_id: expense.id,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));
          console.log('🔍 [EXPENSE MODAL] Splits únicos a inserir:', splitsToInsert.length);

          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) {
            throw splitError;
          }
        }
      }
      onClose?.();
      success(t('web.expenseModal.expenseSaved'));
      onSuccess?.();
    } catch (e) {
      showError(t('web.expenseModal.couldnTSaveTheExpense') + (e.message || t('web.shared.unknownError')));
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
          <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">{t('web.expenseModal.newTransaction')}</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100 min-w-[44px] min-h-[44px]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.description')}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  placeholder={t('web.shared.eGGroceriesPharmacy')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.amount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol()}</span>
                  <input
                    type="text"
                    value={form.amount}
                    onChange={(e) => handleCurrencyChange(e, (value) => setForm({ ...form, amount: value }))}
                    onBlur={(e) => {
                      // Garantir formatação completa ao sair do campo
                      const value = e.target.value.trim();
                      if (!value) {
                        setForm({ ...form, amount: '' });
                        return;
                      }
                      const parsed = parseCurrencyInput(value);
                      if (parsed > 0) {
                        const formatted = parsed.toLocaleString(appLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        setForm({ ...form, amount: formatted });
                      } else {
                        setForm({ ...form, amount: '' });
                      }
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    placeholder={formatCurrencyInput(0)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.date')}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.category')}</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="">{t('web.shared.select')}</option>
                  {dedupeCategories(expenseCategories, [form.category_id]).map(cat => (
                    <option key={cat.id} value={cat.id}>{categoryName(cat.name)}</option>
                  ))}
                </select>
              </div>

              {!isSoloUser ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">{t('web.shared.owner')}</label>
                    <HelpTooltip 
                      content={t('web.expenseModal.individualOnlyYouSeeIt', { p0: organization?.name || t('web.shared.household') })}
                      autoOpen={true}
                    />
                  </div>
                  <select
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">{t('web.shared.select')}</option>
                    {ownerOptions.map(o => (
                      <option key={o.id ?? o.name} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.paymentMethod')}</label>
                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="cash">{t('web.shared.cash')}</option>
                  <option value="debit_card">{t('web.shared.debitCard')}</option>
                  <option value="pix">{t('web.shared.pix')}</option>
                  <option value="credit_card">{t('web.shared.creditCard')}</option>
                  <option value="boleto">{t('web.shared.bankSlipBoleto')}</option>
                  <option value="bank_transfer">{t('web.shared.bankTransfer')}</option>
                  <option value="other">{t('web.shared.other')}</option>
                </select>
              </div>

              {isCredit && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.card2')}</label>
                    <select
                      value={form.card_id}
                      onChange={(e) => setForm({ ...form, card_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      disabled={cards.length === 0}
                    >
                      <option value="">{t('web.shared.select')}</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {cards.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        {t('web.shared.noCreditCardYetAdd')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('web.shared.installments')}</label>
                    <select
                      value={form.installments}
                      onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i+1} value={i+1}>{t('web.shared.x', { p0: i+1 })}</option>
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
                  <h4 className="font-medium text-gray-900">{t('web.expenseModal.expenseSplit')}</h4>
                  <button
                    type="button"
                    onClick={() => showSplitConfig ? resetToDefaultSplit() : setShowSplitConfig(true)}
                    className="text-sm text-flight-blue hover:text-flight-blue/80 font-medium"
                  >
                    {showSplitConfig ? t('web.shared.useDefault') : t('web.shared.customize')}
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
                            {formatMoney(split.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-3 border-t border-gray-300 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{t('web.shared.total')}</span>
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
                          {split.percentage}% ({formatMoney(split.amount)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
        
        {/* Footer fixo */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px]"
          >
            {t('web.shared.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px]"
          >
            {saving ? t('web.shared.saving') : t('web.shared.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default withPaywall(ExpenseModal);
