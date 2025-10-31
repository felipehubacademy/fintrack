import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrganization } from '../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, Users, User } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';

export default function TransactionModal({ isOpen, onClose, onSuccess, editingTransaction = null, categories = [] }) {
  const { organization, user: orgUser, costCenters, incomeCategories, isSoloUser, loading: orgLoading } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();
  
  const [cards, setCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
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
    bank_account_id: '', // Para incomes
  });

  const [splitDetails, setSplitDetails] = useState([]);
  const [showSplitConfig, setShowSplitConfig] = useState(false);

  const isCredit = form.payment_method === 'credit_card';
  // Verificar se é compartilhado: se owner_name for o nome da família
  const isShared = form.owner_name === (organization?.name || 'Família');

  useEffect(() => {
    if (editingTransaction) {
      setTransactionType(editingTransaction.type || 'expense');
      if (editingTransaction.type === 'income') {
        // Se for compartilhado, usar o nome da família
        const ownerName = editingTransaction.is_shared 
          ? (organization?.name || 'Família')
          : (editingTransaction.cost_center?.name || '');
        
        setForm({
          description: editingTransaction.description || '',
          amount: editingTransaction.amount?.toString() || '',
          date: editingTransaction.date || new Date().toISOString().slice(0, 10),
          category: editingTransaction.category || '',
          owner_name: ownerName,
          category_id: '',
          payment_method: editingTransaction.payment_method || 'cash',
          card_id: '',
          installments: 1,
          bank_account_id: editingTransaction.bank_account_id || '',
        });
        if (editingTransaction.income_splits) {
          setSplitDetails(editingTransaction.income_splits);
          setShowSplitConfig(true);
        }
      } else {
        // Para expenses, encontrar o nome correspondente em costCenters
        // para garantir que o valor corresponda exatamente ao dropdown
        const rawOwnerName = editingTransaction.cost_center?.name 
          || editingTransaction.owner 
          || (editingTransaction.is_shared ? (organization?.name || 'Família') : '');
        
        // Buscar o nome correspondente usando costCenters diretamente
        let ownerName = rawOwnerName;
        if (rawOwnerName) {
          // Função de normalização
          const normalize = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          
          // Buscar em costCenters
          const matchingCenter = costCenters?.find(cc => {
            const normalizedCC = normalize(cc.name);
            const normalizedRaw = normalize(rawOwnerName);
            return normalizedCC === normalizedRaw;
          });
          
          if (matchingCenter) {
            ownerName = matchingCenter.name;
          } else if (editingTransaction.is_shared || normalize(rawOwnerName) === normalize(organization?.name || 'Família')) {
            // Se for compartilhado, usar o nome exato da família
            ownerName = organization?.name || 'Família';
          }
        }
        
        setForm({
          description: editingTransaction.description || '',
          amount: editingTransaction.amount?.toString() || '',
          date: editingTransaction.date || new Date().toISOString().slice(0, 10),
          category_id: editingTransaction.category_id || '',
          owner_name: ownerName,
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
  }, [editingTransaction, isOpen, costCenters, organization]);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      if (organization?.id && organization.id !== 'default-org') {
        // Carregar cartões
        const { data: cardsData } = await supabase
          .from('cards')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name');
        setCards(cardsData || []);
        
        // Carregar contas bancárias
        const { data: accountsData } = await supabase
          .from('bank_accounts')
          .select('id, name, bank')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .order('name');
        setBankAccounts(accountsData || []);
      } else {
        setCards([]);
        setBankAccounts([]);
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
    
    // Adicionar nome da organização como opção especial APENAS para contas familiares
    if (!isSoloUser) {
      allCenters.push({
        id: null,
        name: organization?.name || 'Família',
        default_split_percentage: 0,
        color: '#8B5CF6',
        isShared: true
      });
    }
    
    return allCenters;
  }, [costCenters, organization, isSoloUser]);

  // Inicializar splits quando selecionar organização/compartilhado
  useEffect(() => {
    if (isShared && splitDetails.length === 0 && costCenters && costCenters.length > 0) {
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
        console.log('🔍 [TRANSACTION MODAL] Organização/compartilhado selecionado, splits inicializados:', defaultSplits.length);
      }
    } else if (!isShared) {
      setSplitDetails([]);
      setShowSplitConfig(false);
    }
  }, [isShared, costCenters, form.owner_name, organization?.name]);

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
      bank_account_id: '',
    });
    setSplitDetails([]);
    setShowSplitConfig(false);
    setTransactionType('expense');
  };

  const handleSave = async () => {
    if (!organization?.id || !orgUser?.id) {
      showError('Família ou usuário não encontrados');
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
    
    // Validar conta bancária para incomes
    if (transactionType === 'income' && !form.bank_account_id) {
      warning('Selecione uma conta bancária para a entrada');
      return;
    }

    // Recalcular isShared antes de salvar (pode ter mudado)
    const willBeShared = form.owner_name === (organization?.name || 'Família');
    
    // Validar splits se for compartilhado
    if (willBeShared && splitDetails.length === 0) {
      warning('É necessário configurar a divisão da entrada/despesa compartilhada');
      return;
    }

    if (willBeShared && totalPercentage !== 100) {
      warning(`A divisão deve somar exatamente 100%. Atual: ${totalPercentage}%`);
      return;
    }
    
    setSaving(true);
    
    try {
      if (transactionType === 'income') {
        // Salvar como entrada
        const selectedOption = ownerOptions.find(o => o.name === form.owner_name);
        const isOptionShared = selectedOption?.isShared || willBeShared;
        const costCenter = isOptionShared ? null : selectedOption;

        console.log('💾 [TRANSACTION MODAL] Salvando income:', {
          owner_name: form.owner_name,
          organization_name: organization?.name,
          willBeShared,
          isOptionShared,
          cost_center_id: costCenter?.id || null,
          splitDetails_count: splitDetails.length
        });

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
              bank_account_id: form.bank_account_id,
              cost_center_id: willBeShared ? null : costCenter?.id,
              is_shared: willBeShared, // Usar willBeShared calculado acima
              status: 'confirmed'
            })
            .eq('id', editingTransaction.id)
            .select()
            .single();
          
          income = data;
          error = updateError;
        } else {
          // Criar nova entrada
          const insertData = {
            description: form.description,
            amount: parseFloat(form.amount),
            date: form.date,
            category: form.category || null,
            payment_method: form.payment_method,
            bank_account_id: form.bank_account_id,
            cost_center_id: willBeShared ? null : costCenter?.id,
            is_shared: willBeShared, // Usar willBeShared calculado acima
            organization_id: organization.id,
            user_id: orgUser.id,
            status: 'confirmed'
          };
          
          console.log('💾 [TRANSACTION MODAL] Inserting income:', insertData);
          
          const { data, error: insertError } = await supabase
            .from('incomes')
            .insert(insertData)
            .select()
            .single();
          
          income = data;
          error = insertError;
        }

        if (error) throw error;

        console.log('✅ [TRANSACTION MODAL] Income saved:', income);
        
        // Atualizar saldo da conta bancária usando RPC
        if (form.bank_account_id) {
          try {
            console.log('💾 [TRANSACTION MODAL] Verificando transações bancárias para income:', income.id);
            
            // Verificar se já existe transação vinculada ao income
            const { data: existingTransactions, error: checkError } = await supabase
              .from('bank_account_transactions')
              .select('id, bank_account_id, amount')
              .eq('income_id', income.id);
            
            if (checkError) {
              console.error('⚠️ Erro ao verificar transações existentes:', checkError);
            }
            
            console.log('📋 [TRANSACTION MODAL] Transações existentes:', existingTransactions);
            
            // Se existe transação em conta diferente, deletar todas
            if (existingTransactions && existingTransactions.length > 0) {
              const differentAccount = existingTransactions.find(t => t.bank_account_id !== form.bank_account_id);
              if (differentAccount) {
                console.log('🔄 Conta bancária mudou, removendo transação(ões) antiga(s)...');
                const { error: deleteError } = await supabase
                  .from('bank_account_transactions')
                  .delete()
                  .eq('income_id', income.id);
                
                if (deleteError) {
                  console.error('⚠️ Erro ao deletar transações antigas:', deleteError);
                } else {
                  console.log('✅ Transações antigas removidas');
                }
              }
              
              // Se já existe transação na mesma conta, verificar se precisa atualizar valor
              const sameAccount = existingTransactions.find(t => t.bank_account_id === form.bank_account_id);
              if (sameAccount) {
                // Se o valor mudou, deletar e recriar
                if (parseFloat(sameAccount.amount) !== parseFloat(form.amount)) {
                  console.log('🔄 Valor mudou, removendo e recriando transação...');
                  await supabase
                    .from('bank_account_transactions')
                    .delete()
                    .eq('id', sameAccount.id);
                } else {
                  console.log('ℹ️ Transação bancária já existe com mesmo valor, mantendo existente');
                  // O trigger já atualiza o saldo automaticamente, não precisa fazer nada
                  return; // Não criar nova transação
                }
              }
            }
            
            // Criar nova transação bancária
            console.log('💾 [TRANSACTION MODAL] Criando transação bancária...');
            const { data: transactionData, error: transError } = await supabase.rpc('create_bank_transaction', {
              p_bank_account_id: form.bank_account_id,
              p_transaction_type: 'income_deposit',
              p_amount: parseFloat(form.amount),
              p_description: form.description,
              p_date: form.date,
              p_organization_id: organization.id,
              p_user_id: orgUser.id,
              p_expense_id: null,
              p_bill_id: null,
              p_income_id: income.id,
              p_related_account_id: null
            });
            
            if (transError) {
              console.error('⚠️ Erro ao criar transação bancária:', transError);
              showError('Erro ao atualizar saldo da conta: ' + (transError.message || 'Erro desconhecido'));
            } else {
              console.log('✅ Transação bancária criada e saldo atualizado:', transactionData);
              // Sucesso será mostrado no final do handleSave
            }
          } catch (accountError) {
            console.error('⚠️ Erro ao atualizar saldo da conta:', accountError);
            showError('Erro ao atualizar saldo da conta: ' + (accountError.message || 'Erro desconhecido'));
          }
        } else {
          console.warn('⚠️ [TRANSACTION MODAL] bank_account_id não fornecido, não será criada transação bancária');
        }

        if (willBeShared && splitDetails.length > 0) {
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
        
        const isOptionShared = selectedOption.isShared || willBeShared;
        const costCenter = isOptionShared ? null : selectedOption;
        
        console.log('💾 [TRANSACTION MODAL] Salvando expense:', {
          owner_name: form.owner_name,
          organization_name: organization?.name,
          willBeShared,
          isOptionShared,
          cost_center_id: costCenter?.id || null,
          splitDetails_count: splitDetails.length
        });

        if (isCredit) {
          if (!form.card_id || !form.installments) throw new Error('Cartão e parcelas são obrigatórios');
          
          // Para a RPC, enviar nome da família se for compartilhado (a função detecta isso)
          const ownerForRPC = willBeShared ? (organization?.name || 'Família') : form.owner_name;
          
          const { data: parentExpenseId, error } = await supabase.rpc('create_installments', {
            p_amount: Number(form.amount),
            p_installments: Number(form.installments),
            p_description: form.description,
            p_date: form.date,
            p_card_id: form.card_id,
            p_category_id: category?.id || null,
            p_cost_center_id: costCenter?.id || null,
            p_owner: ownerForRPC, // Nome da família para despesa compartilhada
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
            }
          }
          
          console.log('✅ [TRANSACTION MODAL] Installments created, parent_expense_id:', parentExpenseId);

          // Atualizar available_limit do cartão (decrementar o valor total da compra)
          // IMPORTANTE: No crédito, mesmo parcelado, o valor total é descontado imediatamente
          if (form.card_id) {
            try {
              const { data: card } = await supabase
                .from('cards')
                .select('available_limit, credit_limit')
                .eq('id', form.card_id)
                .single();
              
              if (card) {
                const currentAvailable = parseFloat(card.available_limit || card.credit_limit || 0);
                const newAvailable = Math.max(0, currentAvailable - Number(form.amount));
                
                await supabase
                  .from('cards')
                  .update({ available_limit: newAvailable })
                  .eq('id', form.card_id);
                
                console.log('✅ [TRANSACTION MODAL] Updated card available_limit:', newAvailable);
              }
            } catch (cardUpdateError) {
              console.error('⚠️ Erro ao atualizar limite disponível do cartão:', cardUpdateError);
              // Não falhar por causa disso
            }
          }

          if (willBeShared && splitDetails.length > 0) {
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
          
          console.log('💾 [TRANSACTION MODAL] Inserting expense:', dataToSave);

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

          console.log('✅ [TRANSACTION MODAL] Expense saved:', expense);

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
                const amountChange = editingTransaction 
                  ? (Number(form.amount) - Number(editingTransaction.amount || 0)) // Diferença se editando
                  : Number(form.amount); // Valor total se criando
                
                const newAvailable = Math.max(0, currentAvailable - amountChange);
                
                await supabase
                  .from('cards')
                  .update({ available_limit: newAvailable })
                  .eq('id', expense.card_id);
                
                console.log('✅ [TRANSACTION MODAL] Updated card available_limit:', newAvailable);
              }
            } catch (cardUpdateError) {
              console.error('⚠️ Erro ao atualizar limite disponível do cartão:', cardUpdateError);
              // Não falhar por causa disso
            }
          }

          if (willBeShared && splitDetails.length > 0) {
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
      showError('Ops! Não consegui salvar. Tenta de novo?');
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Conta Bancária *</label>
                  <select
                    value={form.bank_account_id}
                    onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    required
                  >
                    <option value="">Selecione uma conta...</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.bank || ''}
                      </option>
                    ))}
                  </select>
                  {bankAccounts.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Nenhuma conta bancária cadastrada. Cadastre uma conta primeiro.
                    </p>
                  )}
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

