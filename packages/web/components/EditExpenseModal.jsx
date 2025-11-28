import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useOrganization } from '../hooks/useOrganization';
import { handleCurrencyChange, parseCurrencyInput, formatCurrencyInput } from '../lib/utils';

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

export default function EditExpenseModal({ 
  isOpen, 
  expenseId,
  onClose, 
  onSuccess,
  costCenters = [],
  categories = [], // Adicionar categorias via props
  organization = null
}) {
  const { success, error: showError, warning } = useNotificationContext();
  const { organization: orgFromHook, isSoloUser, user: orgUser } = useOrganization();
  
  // Usar organization do hook se não passado por prop
  const finalOrganization = organization || orgFromHook;
  
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState([]);
  const [editData, setEditData] = useState({
    owner: '',
    description: '',
    category_id: '', // Mudar para category_id ao invés de category (texto)
    payment_method: '',
    amount: '',
    date: '',
    card_id: '',
    installments: 1
  });
  const [splitDetails, setSplitDetails] = useState([]);
  const [showSplitConfig, setShowSplitConfig] = useState(false);

  const isShared = !isSoloUser && editData.owner === (finalOrganization?.name || 'Organização');
  const isCredit = editData.payment_method === 'credit_card';

  // Preparar opções de responsável (todos os cost centers ativos + Compartilhado)
  const userCostCenter = useMemo(() => {
    if (!isSoloUser || !orgUser) return null;
    return (
      costCenters.find(
        (cc) => cc.user_id === orgUser.id && cc.is_active !== false
      ) || null
    );
  }, [isSoloUser, orgUser, costCenters]);

  const ownerOptions = useMemo(() => {
    if (isSoloUser) {
      return userCostCenter
        ? [
            {
              id: userCostCenter.id,
              name: userCostCenter.name,
              type: 'individual',
              split_percentage: userCostCenter.default_split_percentage,
              color: userCostCenter.color
            }
          ]
        : [];
    }

    const individuals = (costCenters || [])
      .filter(cc => cc.is_active !== false && !cc.is_shared)
      .map(cc => ({ 
        id: cc.id, 
        name: cc.name, 
        type: cc.type, 
        split_percentage: cc.split_percentage, 
        color: cc.color 
      }));
    
    individuals.push({
      id: null,
      name: finalOrganization?.name || 'Organização',
      type: 'shared',
      split_percentage: 0,
      color: '#8B5CF6',
      isShared: true
    });
    
    return individuals;
  }, [costCenters, finalOrganization, isSoloUser, userCostCenter]);

  // Buscar despesa e splits
  useEffect(() => {
    if (isOpen && expenseId) {
      fetchExpense();
    }
  }, [isOpen, expenseId]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      
      // Buscar despesa com splits
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_splits (
            id,
            cost_center_id,
            percentage,
            amount
          )
        `)
        .eq('id', expenseId)
        .single();

      if (error) throw error;

      setExpense(data);
      
      // Se for parcela de cartão, usar o valor total da compra e número total de parcelas
      let amountToShow = data.amount;
      let installmentsToShow = 1;
      let dateToShow = data.date;
      
      if (data.installment_info) {
        if (data.installment_info.total_amount) {
          amountToShow = data.installment_info.total_amount;
        }
        if (data.installment_info.total_installments) {
          installmentsToShow = data.installment_info.total_installments;
        }
      }
      
      // Se for parcela, buscar a data da primeira parcela
      if (data.parent_expense_id || data.installment_info) {
        const parentId = data.parent_expense_id === data.id ? data.id : data.parent_expense_id;
        
        const { data: allInstallments, error: fetchInstallmentsError } = await supabase
          .from('expenses')
          .select('id, date')
          .or(`id.eq.${parentId},parent_expense_id.eq.${parentId}`)
          .order('id', { ascending: true })
          .limit(1);
        
        if (!fetchInstallmentsError && allInstallments && allInstallments.length > 0) {
          dateToShow = allInstallments[0].date;
        }
      }
      
      setEditData({
        owner: isSoloUser && userCostCenter ? userCostCenter.name : (data.owner || ''),
        description: data.description || '',
        category_id: data.category_id || '', // Usar category_id
        payment_method: data.payment_method || '',
        amount: amountToShow ? formatCurrencyInput(amountToShow) : '',
        date: dateToShow || '',
        card_id: data.card_id || '',
        installments: installmentsToShow
      });

      // Se tiver splits, carregar
      if (data.expense_splits && data.expense_splits.length > 0) {
        const splits = data.expense_splits.map(split => {
          const cc = costCenters.find(c => c.id === split.cost_center_id);
          return {
            cost_center_id: split.cost_center_id,
            name: cc?.name || 'Desconhecido',
            color: cc?.color || '#6B7280',
            percentage: parseFloat(split.percentage),
            amount: parseFloat(split.amount)
          };
        });
        setSplitDetails(splits);
        setShowSplitConfig(true);
      } else if (data.split && data.owner === (finalOrganization?.name || 'Organização')) {
        // Despesa compartilhada SEM splits (usar fallback)
        const individualCenters = costCenters.filter(cc => cc.type === 'individual');
        const defaultSplits = individualCenters.map(cc => ({
          cost_center_id: cc.id,
          name: cc.name,
          color: cc.color,
          percentage: parseFloat(cc.split_percentage || 0),
          amount: (parseFloat(data.amount) * parseFloat(cc.split_percentage || 0)) / 100
        }));
        setSplitDetails(defaultSplits);
      }

      // Carregar cartões ativos da organização
      if (finalOrganization?.id && finalOrganization.id !== 'default-org') {
        const { data: cardsData } = await supabase
          .from('cards')
          .select('id,name,available_limit,credit_limit')
          .eq('organization_id', finalOrganization.id)
          .eq('is_active', true)
          .order('name');
        setCards(cardsData || []);
      } else {
        setCards([]);
      }
    } catch (error) {
      console.error('Erro ao buscar despesa:', error);
      showError('Erro ao carregar despesa');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Inicializar divisão quando "Organização" for selecionado
  useEffect(() => {
    if (isShared && splitDetails.length === 0) {
      const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false && cc.user_id);
      console.log('🔍 [EDIT EXPENSE MODAL] Active centers:', activeCenters);
      console.log('🔍 [EDIT EXPENSE MODAL] Default split percentages:', activeCenters.map(cc => ({ name: cc.name, percentage: cc.default_split_percentage })));
      
      const defaultSplits = activeCenters.map(cc => ({
        cost_center_id: cc.id,
        name: cc.name,
        color: cc.color,
        percentage: parseFloat(cc.default_split_percentage || 0),
        amount: 0
      }));
      
      console.log('🔍 [EDIT EXPENSE MODAL] Default splits created:', defaultSplits);
      setSplitDetails(defaultSplits);
    } else if (!isShared && editData.owner !== expense?.owner) {
      // Limpar splits se mudou de compartilhado para individual
      setSplitDetails([]);
      setShowSplitConfig(false);
    }
  }, [isShared, editData.owner]);

  // Recalcular valores quando amount ou percentuais mudarem
  useEffect(() => {
    if (isShared && editData.amount && splitDetails.length > 0) {
      const totalAmount = parseCurrencyInput(editData.amount) || 0;
      console.log('🔍 [EDIT EXPENSE MODAL] Recalculating splits for amount:', totalAmount);
      console.log('🔍 [EDIT EXPENSE MODAL] Current splitDetails before recalculation:', splitDetails);
      
      const updatedSplits = splitDetails.map(split => ({
        ...split,
        amount: (totalAmount * split.percentage) / 100
      }));
      
      console.log('🔍 [EDIT EXPENSE MODAL] Updated splitDetails after recalculation:', updatedSplits);
      setSplitDetails(updatedSplits);
    }
  }, [editData.amount, isShared, splitDetails.length]);

  // Recriar splitDetails quando showSplitConfig muda para true
  useEffect(() => {
    if (isShared && showSplitConfig && splitDetails.length === 0) {
      const totalAmount = parseCurrencyInput(editData.amount) || 0;
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
  }, [isShared, showSplitConfig, costCenters, editData.amount]);

  useEffect(() => {
    if (!isSoloUser || !userCostCenter) return;
    setEditData((prev) => {
      if (prev.owner === userCostCenter.name) {
        return prev;
      }
      return {
        ...prev,
        owner: userCostCenter.name
      };
    });
  }, [isSoloUser, userCostCenter, userCostCenter?.name, isOpen]);

  const totalPercentage = useMemo(() => {
    return splitDetails.reduce((sum, split) => sum + (parseFloat(split.percentage) || 0), 0);
  }, [splitDetails]);

  const updateSplitPercentage = (index, newPercentage) => {
    const totalAmount = parseFloat(editData.amount) || 0;
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
    const totalAmount = parseFloat(editData.amount) || 0;
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
    if (!editData.owner || !editData.description || !editData.amount || !editData.date) {
      warning('Preencha todos os campos obrigatórios');
      return;
    }

    if (isShared && totalPercentage !== 100) {
      warning('A divisão deve somar exatamente 100%');
      return;
    }

    setSaving(true);
    try {
      // Determinar cost_center_id e category
      let selectedOption = ownerOptions.find(o => o.name === editData.owner);
      if (!selectedOption && isSoloUser && userCostCenter) {
        selectedOption = { id: userCostCenter.id, name: userCostCenter.name };
      }
      const costCenterId = selectedOption?.isShared ? null : selectedOption?.id;
      const category = categories.find(c => c.id === editData.category_id);

      // Verificar se a despesa atual é uma parcela existente
      const isExistingInstallment = expense?.parent_expense_id || expense?.installment_info;
      const wasCredit = expense?.payment_method === 'credit_card';

      // Se já era cartão de crédito E continua sendo cartão
      if (isCredit && wasCredit && isExistingInstallment) {
        if (!editData.card_id) {
          warning('Selecione um cartão de crédito');
          setSaving(false);
          return;
        }

        // Buscar o parent_expense_id correto
        const parentId = expense.parent_expense_id === expense.id 
          ? expense.id 
          : expense.parent_expense_id;

        // Verificar quantas parcelas existem atualmente
        const { data: currentInstallments, error: countError } = await supabase
          .from('expenses')
          .select('id')
          .or(`id.eq.${parentId},parent_expense_id.eq.${parentId}`);

        if (countError) throw countError;

        const currentInstallmentCount = currentInstallments?.length || 0;
        const newInstallmentCount = Number(editData.installments);

        // Buscar a data da primeira parcela original para comparar
        const firstInstallment = currentInstallments.reduce((min, curr) => 
          curr.id < min.id ? curr : min
        , currentInstallments[0]);

        const { data: firstInstallmentData, error: fetchFirstError } = await supabase
          .from('expenses')
          .select('date')
          .eq('id', firstInstallment.id)
          .single();

        if (fetchFirstError) throw fetchFirstError;

        const originalFirstDate = firstInstallmentData.date;
        const dateChanged = originalFirstDate !== editData.date;

        console.log('🔍 [EDIT EXPENSE MODAL] Parcelas atuais:', currentInstallmentCount, 'Novas:', newInstallmentCount);
        console.log('📅 [EDIT EXPENSE MODAL] Data original:', originalFirstDate, 'Nova:', editData.date, 'Mudou?', dateChanged);

        // Se o número de parcelas mudou OU a data mudou, recriar o grupo
        if (currentInstallmentCount !== newInstallmentCount || dateChanged) {
          const reason = dateChanged && currentInstallmentCount !== newInstallmentCount 
            ? 'Número de parcelas E data mudaram' 
            : dateChanged 
              ? 'Data mudou' 
              : 'Número de parcelas mudou';
          console.log(`🔄 [EDIT EXPENSE MODAL] ${reason}! Recriando grupo...`);

          // Deletar todas as parcelas antigas
          const { error: deleteError } = await supabase
            .from('expenses')
            .delete()
            .or(`id.eq.${parentId},parent_expense_id.eq.${parentId}`);

          if (deleteError) {
            console.error('❌ [EDIT EXPENSE MODAL] Erro ao deletar parcelas antigas:', deleteError);
            throw deleteError;
          }

          // Criar novas parcelas via RPC usando a data escolhida pelo usuário
          const ownerForRPC = editData.owner;

          const { data: parentExpenseId, error: rpcError } = await supabase.rpc('create_installments', {
            p_amount: parseCurrencyInput(editData.amount),
            p_installments: newInstallmentCount,
            p_description: editData.description.trim(),
            p_date: editData.date, // Usar a data escolhida pelo usuário
            p_card_id: editData.card_id,
            p_category_id: category?.id || null,
            p_cost_center_id: costCenterId || null,
            p_owner: ownerForRPC,
            p_organization_id: finalOrganization.id,
            p_user_id: orgUser.id,
            p_whatsapp_message_id: null,
            p_split_template: null
          });

          if (rpcError) {
            console.error('❌ [EDIT EXPENSE MODAL] Erro ao criar novas parcelas:', rpcError);
            throw rpcError;
          }

          console.log('✅ [EDIT EXPENSE MODAL] Novas parcelas criadas:', parentExpenseId);

          // Inserir splits se necessário
          if (isShared && splitDetails.length > 0) {
            const { data: newInstallments, error: fetchError } = await supabase
              .from('expenses')
              .select('id')
              .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
            
            if (fetchError) throw fetchError;

            const splitsToInsert = newInstallments.flatMap(installment => 
              splitDetails.map(split => ({
                expense_id: installment.id,
                cost_center_id: split.cost_center_id,
                percentage: split.percentage,
                amount: split.amount / newInstallmentCount
              }))
            );

            const { error: splitError } = await supabase
              .from('expense_splits')
              .insert(splitsToInsert);

            if (splitError) {
              console.error('❌ [EDIT EXPENSE MODAL] Erro ao inserir splits:', splitError);
              throw splitError;
            }
          }

          console.log('✅ [EDIT EXPENSE MODAL] Grupo de parcelas recriado com sucesso');

        } else {
          // Número de parcelas não mudou, apenas atualizar
          console.log('🔄 [EDIT EXPENSE MODAL] Atualizando parcelas existentes do grupo');

          // Usar função RPC para atualizar parcelas (bypassa RLS)
          const { data: updateResult, error: updateError } = await supabase.rpc('update_installment_group', {
            p_parent_expense_id: parentId,
            p_description: editData.description.trim(),
            p_category_id: editData.category_id || null,
            p_card_id: editData.card_id,
            p_owner: editData.owner.trim(),
            p_cost_center_id: costCenterId,
            p_is_shared: isShared,
            p_total_amount: parseCurrencyInput(editData.amount),
            p_organization_id: finalOrganization.id,
            p_user_id: orgUser.id
          });

          if (updateError) {
            console.error('❌ [EDIT EXPENSE MODAL] Erro ao atualizar parcelas:', updateError);
            throw updateError;
          }

          console.log('✅ [EDIT EXPENSE MODAL] Parcelas atualizadas via RPC:', updateResult);

          // Atualizar splits se necessário
          if (isShared) {
            const installmentIds = updateResult[0]?.installment_ids || [];
            
            if (installmentIds.length > 0) {
              const { error: deleteSplitsError } = await supabase
                .from('expense_splits')
                .delete()
                .in('expense_id', installmentIds);

              if (deleteSplitsError) {
                console.warn('⚠️ [EDIT EXPENSE MODAL] Erro ao deletar splits antigos:', deleteSplitsError);
              }

              if (showSplitConfig && splitDetails.length > 0) {
                const splitsToInsert = installmentIds.flatMap(installmentId => 
                  splitDetails.map(split => ({
                    expense_id: installmentId,
                    cost_center_id: split.cost_center_id,
                    percentage: split.percentage,
                    amount: split.amount / installmentIds.length
                  }))
                );

                const { error: insertSplitsError } = await supabase
                  .from('expense_splits')
                  .insert(splitsToInsert);

                if (insertSplitsError) {
                  console.error('❌ [EDIT EXPENSE MODAL] Erro ao inserir splits:', insertSplitsError);
                  throw insertSplitsError;
                }
              }
            }
          }

          console.log('✅ [EDIT EXPENSE MODAL] Parcelas e splits atualizados com sucesso');
        }

      } else if (isCredit && (!wasCredit || !isExistingInstallment)) {
        // Converter para cartão de crédito (criar novas parcelas)
        if (!editData.card_id) {
          warning('Selecione um cartão de crédito');
          setSaving(false);
          return;
        }
        if (!editData.installments || editData.installments < 1) {
          warning('Selecione o número de parcelas');
          setSaving(false);
          return;
        }

        console.log('🔄 [EDIT EXPENSE MODAL] Convertendo para cartão de crédito');

        const ownerForRPC = editData.owner;

        // Criar novas parcelas
        const { data: parentExpenseId, error: rpcError } = await supabase.rpc('create_installments', {
          p_amount: parseCurrencyInput(editData.amount),
          p_installments: Number(editData.installments),
          p_description: editData.description.trim(),
          p_date: editData.date,
          p_card_id: editData.card_id,
          p_category_id: category?.id || null,
          p_cost_center_id: costCenterId || null,
          p_owner: ownerForRPC,
          p_organization_id: finalOrganization.id,
          p_user_id: orgUser.id,
          p_whatsapp_message_id: null,
          p_split_template: null
        });
        if (rpcError) throw rpcError;

        // Se compartilhado, atualizar owner
        if (isShared && ownerForRPC !== editData.owner) {
          await supabase
            .from('expenses')
            .update({ owner: editData.owner.trim(), is_shared: true })
            .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
        }

        // Deletar apenas se NÃO for parcela (ou deletar splits se for)
        if (isExistingInstallment) {
          // Se era parcela, deletar todas as parcelas do grupo antigo
          const oldParentId = expense.parent_expense_id === expense.id 
            ? expense.id 
            : expense.parent_expense_id;
          
          await supabase
            .from('expenses')
            .delete()
            .or(`id.eq.${oldParentId},parent_expense_id.eq.${oldParentId}`);
        } else {
          // Deletar despesa simples
          await supabase.from('expenses').delete().eq('id', expenseId);
        }

        // Inserir splits manualmente para TODAS as parcelas (se for compartilhado)
        if (isShared && splitDetails.length > 0) {
          const { data: allInstallments, error: fetchError } = await supabase
            .from('expenses')
            .select('id')
            .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
          
          if (fetchError) throw fetchError;
          
          // Verificar e deletar splits existentes (trigger pode criar automaticamente)
          const installmentIds = allInstallments.map(i => i.id);
          const { data: existingSplits } = await supabase
            .from('expense_splits')
            .select('*')
            .in('expense_id', installmentIds);
          
          if (existingSplits && existingSplits.length > 0) {
            console.log('🗑️ [EDIT EXPENSE MODAL] Deletando', existingSplits.length, 'splits existentes das parcelas...');
            await supabase
              .from('expense_splits')
              .delete()
              .in('expense_id', installmentIds);
          }
          
          // Usar helper para garantir unicidade
          const uniqueSplits = aggregateSplits(splitDetails);
          
          const splitsToInsert = allInstallments.flatMap(installment => 
            uniqueSplits.map(split => ({
              expense_id: installment.id,
              cost_center_id: split.cost_center_id,
              percentage: split.percentage,
              amount: split.amount / Number(editData.installments)
            }))
          );

          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) {
            console.error('❌ [EDIT EXPENSE MODAL] Erro ao inserir splits:', splitError);
            throw splitError;
          }
        }

        console.log('✅ [EDIT EXPENSE MODAL] Conversão para cartão concluída');

      } else {
        // Atualizar despesa (não cartão de crédito ou mudou de cartão para outro método)
        console.log('🔄 [EDIT EXPENSE MODAL] Atualizando despesa simples');

        // Se estava como cartão e mudou para outro método, deletar todas as parcelas
        if (wasCredit && isExistingInstallment && !isCredit) {
          const oldParentId = expense.parent_expense_id === expense.id 
            ? expense.id 
            : expense.parent_expense_id;
          
          // Deletar todas as parcelas exceto a primeira (que será atualizada)
          await supabase
            .from('expenses')
            .delete()
            .neq('id', expense.id)
            .eq('parent_expense_id', oldParentId);

          // Atualizar a primeira parcela para despesa simples
          await supabase
            .from('expenses')
            .update({
              owner: editData.owner.trim(),
              cost_center_id: costCenterId,
              is_shared: isShared,
              description: editData.description.trim(),
              category_id: editData.category_id || null,
              category: category?.name || null,
              payment_method: editData.payment_method,
              amount: parseCurrencyInput(editData.amount),
              date: editData.date,
              card_id: null,
              installment_info: null,
              parent_expense_id: null
            })
            .eq('id', expenseId);
        } else {
          // Atualização simples
          const { error: updateError } = await supabase
            .from('expenses')
            .update({
              owner: editData.owner.trim(),
              cost_center_id: costCenterId,
              is_shared: isShared,
              description: editData.description.trim(),
              category_id: editData.category_id || null,
              category: category?.name || null,
              payment_method: editData.payment_method,
              amount: parseCurrencyInput(editData.amount),
              date: editData.date
            })
            .eq('id', expenseId);
          if (updateError) throw updateError;
        }

        console.log('✅ [EDIT EXPENSE MODAL] Despesa atualizada');
      }

      // Se for compartilhado E NÃO foi convertido para cartão, gerenciar splits da despesa
      // (Se foi convertido para cartão, os splits já foram inseridos nas parcelas acima)
      // ⚠️ IMPORTANTE: Se foi convertido para cartão (isCredit), a despesa antiga foi deletada,
      // então NÃO devemos tentar inserir splits nela!
      if (isShared && !isCredit) {
        // Deletar splits antigos
        const { error: deleteError } = await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', expenseId);

        if (deleteError) throw deleteError;

        // Criar novos splits SE tiver personalização
        if (showSplitConfig && splitDetails.length > 0) {
          // Garantir unicidade por cost_center_id antes de inserir
          const uniqueSplits = aggregateSplits(splitDetails);
          const splitsToInsert = uniqueSplits.map(split => ({
            expense_id: expenseId,
            cost_center_id: split.cost_center_id,
            percentage: split.percentage,
            amount: split.amount
          }));

          console.log('💾 [EDIT EXPENSE MODAL] Inserindo splits únicos:', splitsToInsert.length);

          const { error: insertError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (insertError) throw insertError;
        }
      } else {
        // Se mudou de compartilhado para individual, deletar splits
        await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', expenseId);
      }

      onSuccess();
      onClose();
      success('Despesa atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showError('Erro ao salvar despesa');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header fixo */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-lg">Editar Despesa</h2>
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
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  placeholder="Ex: Mercado, Farmácia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                  <input
                    type="text"
                    value={editData.amount}
                    onChange={(e) => handleCurrencyChange(e, (value) => setEditData({ ...editData, amount: value }))}
                    onBlur={(e) => {
                      // Garantir formatação completa ao sair do campo
                      const value = e.target.value.trim();
                      if (!value) {
                        setEditData({ ...editData, amount: '' });
                        return;
                      }
                      const parsed = parseCurrencyInput(value);
                      if (parsed > 0) {
                        const formatted = parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        setEditData({ ...editData, amount: formatted });
                      } else {
                        setEditData({ ...editData, amount: '' });
                      }
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                <input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
                {isCredit && (expense?.parent_expense_id || expense?.installment_info) && (
                  <p className="mt-1 text-xs text-gray-500">
                    Data da primeira parcela. Ao mudar a data ou o nº de parcelas, todas serão recriadas.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <select
                  value={editData.category_id}
                  onChange={(e) => setEditData({ ...editData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="">Selecione...</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {!isSoloUser ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
                  <select
                    value={editData.owner}
                    onChange={(e) => setEditData({ ...editData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  >
                    <option value="">Selecione...</option>
                    {ownerOptions.map(o => (
                      <option key={o.name} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                <select
                  value={editData.payment_method}
                  onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="">Selecione...</option>
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
                      value={editData.card_id}
                      onChange={(e) => setEditData({ ...editData, card_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                      disabled={cards.length === 0}
                    >
                      <option value="">Selecione...</option>
                      {cards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {cards.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        Nenhum cartão de crédito cadastrado. Cadastre um cartão primeiro.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parcelas *</label>
                    <select
                      value={editData.installments}
                      onChange={(e) => setEditData({ ...editData, installments: Number(e.target.value) })}
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
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
}

