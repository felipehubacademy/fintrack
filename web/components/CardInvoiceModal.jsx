import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, Calendar, CreditCard, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MarkInvoiceAsPaidModal from './MarkInvoiceAsPaidModal';
import RolloverInvoiceModal from './RolloverInvoiceModal';
import { useOrganization } from '../hooks/useOrganization';
import { useNotificationContext } from '../contexts/NotificationContext';
import { getBrazilToday, getBrazilTodayString, createBrazilDate, isDateBeforeOrEqualToday } from '../lib/utils';

export default function CardInvoiceModal({ isOpen, onClose, card }) {
  const { organization, user, costCenters } = useOrganization();
  const { success, error: showError } = useNotificationContext();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());

  useEffect(() => {
    if (isOpen && card) {
      fetchInvoices();
      setExpandedInvoices(new Set()); // Resetar expansões ao abrir
    }
  }, [isOpen, card]);

  const fetchInvoices = async () => {
    if (!card || card.type !== 'credit') return;
    
    setLoading(true);
    try {
      // Usar fuso horário do Brasil para calcular data de referência
      const today = getBrazilToday();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const refDate = `${year}-${month}-${day}`;

      // Buscar ciclo atual para destacar na UI
      let startDate, endDate;
      try {
        const { data: cycle } = await supabase.rpc('get_billing_cycle', {
          card_uuid: card.id,
          reference_date: refDate
        });
        if (cycle && cycle.length) {
          startDate = cycle[0].start_date;
          endDate = cycle[0].end_date;
          setCurrentCycle({ start: startDate, end: endDate });
        }
      } catch (error) {
        console.error('⚠️ Erro ao buscar ciclo atual:', error);
      }

      // Buscar todas as despesas confirmadas do cartão
      console.log(`🔍 Buscando despesas para o cartão:`, {
        card_id: card.id,
        card_name: card.name,
        payment_method: 'credit_card',
        status: 'confirmed'
      });

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('payment_method', 'credit_card')
        .eq('card_id', card.id)
        .eq('status', 'confirmed')
        .order('date', { ascending: true });

      if (expensesError) {
        console.error('⚠️ Erro ao buscar despesas:', expensesError);
        setInvoices([]);
        return;
      }

      console.log(`🔍 Query retornou ${expenses?.length || 0} despesas`);

      // Se não encontrou nada, tentar buscar sem filtros para debug
      if (!expenses || expenses.length === 0) {
        console.log('⚠️ Nenhuma despesa encontrada com os filtros. Buscando todas as despesas do cartão para debug...');
        
        const { data: allExpenses, error: allExpensesError } = await supabase
          .from('expenses')
          .select('id, date, amount, payment_method, card_id, status, installment_info')
          .eq('card_id', card.id)
          .order('date', { ascending: true });
        
        if (!allExpensesError && allExpenses) {
          console.log(`🔍 Total de despesas encontradas (sem filtros): ${allExpenses.length}`);
          console.log('🔍 Detalhes das despesas:', allExpenses.map(e => ({
            id: e.id,
            date: e.date,
            amount: e.amount,
            payment_method: e.payment_method,
            status: e.status,
            has_installment_info: !!e.installment_info
          })));
        }
        
        // Verificar se o cartão tem available_limit diferente do credit_limit
        // (isso explicaria o valor de 150 sem despesas)
        if (card.available_limit !== null && card.credit_limit !== null) {
          const calculatedUsed = Number(card.credit_limit) - Number(card.available_limit);
          console.log(`💰 Cartão tem available_limit definido:`, {
            credit_limit: card.credit_limit,
            available_limit: card.available_limit,
            calculated_used: calculatedUsed,
            info: 'O valor de "usado" pode estar vindo do available_limit, não de despesas no banco.'
          });
        }
        
        console.log('ℹ️ Nenhuma despesa encontrada para este cartão');
        setInvoices([]);
        return;
      }

      console.log(`🔍 Processando ${expenses.length} despesas para agrupar faturas`);
      console.log(`🔍 Informações do cartão:`, { 
        id: card.id, 
        name: card.name, 
        closing_day: card.closing_day, 
        billing_day: card.billing_day 
      });

      // Agrupar despesas por fatura
      const invoicesMap = {};
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const expense of expenses) {
        try {
          console.log(`🔍 Processando despesa ${expense.id}:`, {
            date: expense.date,
            amount: expense.amount,
            has_installment_info: !!expense.installment_info,
            installment_info: expense.installment_info
          });

          // Verificar se é parcela: deve ter installment_info E total_installments > 1
          // Se total_installments = 1, é "à vista no crédito" mesmo tendo installment_info
          if (expense.installment_info && 
              expense.installment_info.total_installments && 
              expense.installment_info.total_installments > 1) {
            // É uma parcela de compra parcelada - usar a data da parcela (já calculada corretamente na criação)
            // A data da parcela corresponde ao closing_day da fatura onde ela cai
            const parcelDate = expense.date;
            
            console.log(`  📦 É parcela ${expense.installment_info.current_installment}/${expense.installment_info.total_installments} (data: ${parcelDate})`);
            
            // Calcular qual é o ciclo dessa data
            try {
              const { data: parcelCycle, error: cycleError } = await supabase.rpc('get_billing_cycle', {
                card_uuid: card.id,
                reference_date: parcelDate
              });
              
              if (cycleError) {
                console.error(`  ⚠️ Erro ao calcular ciclo da parcela ${expense.id}:`, cycleError);
                skippedCount++;
                continue;
              }
              
              console.log(`  📅 Ciclo da parcela:`, parcelCycle);
              
              if (parcelCycle && parcelCycle.length) {
                const cycleKey = parcelCycle[0].start_date;
                const installmentAmount = expense.installment_info.installment_amount || expense.amount || 0;
                
                console.log(`  ✅ Adicionando à fatura do ciclo: ${cycleKey} (valor: ${installmentAmount})`);
                
                if (!invoicesMap[cycleKey]) {
                  invoicesMap[cycleKey] = {
                    startDate: parcelCycle[0].start_date,
                    endDate: parcelCycle[0].end_date,
                    total: 0,
                    expenses: []
                  };
                }
                
                invoicesMap[cycleKey].total += Number(installmentAmount);
                invoicesMap[cycleKey].expenses.push({
                  ...expense,
                  installmentAmount
                });
                processedCount++;
              } else {
                console.warn(`  ⚠️ Nenhum ciclo retornado para a parcela ${expense.id}`);
                skippedCount++;
              }
            } catch (error) {
              console.error(`  ⚠️ Erro ao calcular ciclo da parcela ${expense.id}:`, error);
              skippedCount++;
            }
          } else {
            // Despesa à vista no crédito (1x) ou sem parcelamento
            console.log(`  💳 Despesa à vista no crédito (data: ${expense.date}, valor: ${expense.amount})`);
            
            // Calcular em qual ciclo essa despesa cai
            try {
              const { data: expenseCycle, error: cycleError } = await supabase.rpc('get_billing_cycle', {
                card_uuid: card.id,
                reference_date: expense.date
              });
              
              if (cycleError) {
                console.error(`  ⚠️ Erro ao calcular ciclo da despesa ${expense.id}:`, cycleError);
                skippedCount++;
                continue;
              }
              
              console.log(`  📅 Ciclo da despesa:`, expenseCycle);
              
              if (expenseCycle && expenseCycle.length) {
                const cycleKey = expenseCycle[0].start_date;
                
                console.log(`  ✅ Adicionando à fatura do ciclo: ${cycleKey} (valor: ${expense.amount})`);
                
                if (!invoicesMap[cycleKey]) {
                  invoicesMap[cycleKey] = {
                    startDate: expenseCycle[0].start_date,
                    endDate: expenseCycle[0].end_date,
                    total: 0,
                    expenses: []
                  };
                }
                
                invoicesMap[cycleKey].total += Number(expense.amount || 0);
                invoicesMap[cycleKey].expenses.push(expense);
                processedCount++;
              } else {
                console.warn(`  ⚠️ Nenhum ciclo retornado para a despesa ${expense.id} (data: ${expense.date})`);
                skippedCount++;
              }
            } catch (error) {
              console.error(`  ⚠️ Erro ao calcular ciclo da despesa ${expense.id}:`, error);
              skippedCount++;
            }
          }
        } catch (error) {
          console.error(`⚠️ Erro ao processar despesa ${expense.id}:`, error);
          skippedCount++;
        }
      }
      
      console.log(`📊 Resumo: ${processedCount} processadas, ${skippedCount} ignoradas`);
      
      console.log(`✅ Faturas agrupadas:`, Object.keys(invoicesMap).length);
      console.log(`📋 Detalhes das faturas:`, invoicesMap);

      // Buscar status e paid_amount de card_invoices para cada fatura
      console.log('🔍 Buscando registros de card_invoices...');
      const { data: invoiceRecords, error: invoiceRecordsError } = await supabase
        .from('card_invoices')
        .select('cycle_start_date, status, paid_amount, total_amount')
        .eq('card_id', card.id);

      if (invoiceRecordsError) {
        console.error('⚠️ Erro ao buscar registros de faturas:', invoiceRecordsError);
      } else {
        console.log(`✅ Encontrados ${invoiceRecords?.length || 0} registros de faturas:`, invoiceRecords);
      }

      // Mapear status e paid_amount para as faturas
      for (const cycleKey in invoicesMap) {
        const invoiceRecord = invoiceRecords?.find(rec => rec.cycle_start_date === cycleKey);
        console.log(`📋 Mapeando fatura ${cycleKey}:`, invoiceRecord || 'sem registro');
        if (invoiceRecord) {
          invoicesMap[cycleKey].status = invoiceRecord.status;
          invoicesMap[cycleKey].paid_amount = invoiceRecord.paid_amount;
        } else {
          invoicesMap[cycleKey].status = 'pending';
          invoicesMap[cycleKey].paid_amount = 0;
        }
      }

      // Converter para array e ordenar por data
      const invoicesArray = Object.values(invoicesMap).sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );

      console.log(`✅ Faturas finais ordenadas:`, invoicesArray);
      setInvoices(invoicesArray);
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    // Parse a data como UTC para evitar problemas de fuso horário
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleMarkInvoiceAsPaid = async (paymentData) => {
    if (!selectedInvoice || !card) return;

    try {
      const { bank_account_id, amount } = paymentData;
      
      console.log('💳 [PAYMENT] Iniciando pagamento:', {
        bank_account_id,
        amount,
        card_name: card.name,
        invoice_total: selectedInvoice.total,
        invoice_start: selectedInvoice.startDate
      });
      
      // Determinar o status da fatura após o pagamento
      const totalInvoice = selectedInvoice.total;
      const isFullPayment = amount >= totalInvoice;
      const newStatus = isFullPayment ? 'paid' : 'paid_partial';

      console.log('💳 [PAYMENT] Status calculado:', { isFullPayment, newStatus });

      // 1. Criar transação bancária (débito na conta) usando a função RPC
      console.log('💳 [PAYMENT] Criando transação bancária...');
      const { data: transactionId, error: bankError } = await supabase
        .rpc('create_bank_transaction', {
          p_bank_account_id: bank_account_id,
          p_transaction_type: 'manual_debit',
          p_amount: amount,
          p_description: `Pagamento Fatura ${card.name} - ${formatDate(selectedInvoice.startDate)}`,
          p_date: getBrazilTodayString(),
          p_organization_id: organization.id,
          p_user_id: user?.id
        });

      if (bankError) {
        console.error('❌ [PAYMENT] Erro ao criar transação bancária:', bankError);
        throw bankError;
      }

      console.log('✅ [PAYMENT] Transação bancária criada:', transactionId);

      // Buscar a transação criada para pegar o ID
      const { data: bankTransaction } = await supabase
        .from('bank_account_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (!bankTransaction) {
        throw new Error('Transação bancária não encontrada após criação');
      }

      console.log('✅ [PAYMENT] Transação bancária confirmada:', bankTransaction.id);

      // 2. Buscar ou criar registro da fatura em card_invoices
      console.log('💳 [PAYMENT] Buscando registro da fatura...');
      let invoiceRecord;
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', card.id)
        .eq('cycle_start_date', selectedInvoice.startDate)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ [PAYMENT] Erro ao buscar fatura:', fetchError);
        throw fetchError;
      }

      if (existingInvoice) {
        console.log('📋 [PAYMENT] Fatura existente encontrada:', existingInvoice);
        // Atualizar registro existente
        const newPaidAmount = Number(existingInvoice.paid_amount || 0) + amount;
        const finalStatus = newPaidAmount >= totalInvoice ? 'paid' : 'paid_partial';
        
        console.log('💳 [PAYMENT] Atualizando fatura:', {
          old_paid: existingInvoice.paid_amount,
          new_paid: newPaidAmount,
          total: totalInvoice,
          new_status: finalStatus
        });

        const { data: updated, error: updateError } = await supabase
          .from('card_invoices')
          .update({
            paid_amount: newPaidAmount,
            status: finalStatus,
            first_payment_at: existingInvoice.first_payment_at || new Date().toISOString(),
            fully_paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInvoice.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [PAYMENT] Erro ao atualizar fatura:', updateError);
          throw updateError;
        }
        
        console.log('✅ [PAYMENT] Fatura atualizada:', updated);
        invoiceRecord = updated;
      } else {
        console.log('📋 [PAYMENT] Criando nova fatura');
        // Criar novo registro
        const { data: created, error: createError } = await supabase
          .from('card_invoices')
          .insert({
            card_id: card.id,
            cycle_start_date: selectedInvoice.startDate,
            cycle_end_date: selectedInvoice.endDate,
            total_amount: totalInvoice,
            paid_amount: amount,
            status: newStatus,
            first_payment_at: new Date().toISOString(),
            fully_paid_at: isFullPayment ? new Date().toISOString() : null,
            organization_id: organization.id,
            user_id: user?.id
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ [PAYMENT] Erro ao criar fatura:', createError);
          throw createError;
        }
        
        console.log('✅ [PAYMENT] Fatura criada:', created);
        invoiceRecord = created;
      }

      // 3. Registrar pagamento em card_invoice_payments
      console.log('💳 [PAYMENT] Registrando pagamento...');
      const { error: paymentError } = await supabase
        .from('card_invoice_payments')
        .insert({
          invoice_id: invoiceRecord.id,
          bank_transaction_id: bankTransaction.id,
          amount,
          payment_date: getBrazilTodayString()
        });

      if (paymentError) {
        console.error('❌ [PAYMENT] Erro ao registrar pagamento:', paymentError);
        throw paymentError;
      }

      console.log('✅ [PAYMENT] Pagamento registrado');

      // 4. Atualizar limite do cartão (despesas permanecem 'confirmed')
      const currentAvailableLimit = Number(card.available_limit || 0);
      const creditLimit = Number(card.credit_limit || 0);
      
      console.log('💳 [PAYMENT] Atualizando limite do cartão:', {
        current_limit: currentAvailableLimit,
        credit_limit: creditLimit,
        amount_paid: amount
      });
      
      // Adicionar o valor pago ao limite disponível
      const newAvailableLimit = Math.min(creditLimit, currentAvailableLimit + amount);
      
      console.log('💳 [PAYMENT] Novo limite calculado:', newAvailableLimit);

      const { error: limitError } = await supabase
        .from('cards')
        .update({ available_limit: newAvailableLimit })
        .eq('id', card.id);

      if (limitError) {
        console.error('❌ [PAYMENT] Erro ao atualizar limite:', limitError);
        throw limitError;
      }

      console.log('✅ [PAYMENT] Limite do cartão atualizado');

      if (isFullPayment) {
        success(`Fatura de ${formatCurrency(totalInvoice)} paga! Limite do cartão liberado.`);
      } else {
        success(`Pagamento parcial de ${formatCurrency(amount)} registrado. Limite de ${formatCurrency(amount)} liberado. Saldo restante: ${formatCurrency(totalInvoice - amount)}`);
      }
      
      console.log('💳 [PAYMENT] Recarregando faturas...');
      // Recarregar faturas
      await fetchInvoices();
      
      console.log('💳 [PAYMENT] Fechando modais...');
      // Fechar modal de confirmação
      setShowMarkAsPaidModal(false);
      setSelectedInvoice(null);
      
      // Fechar modal de faturas também
      onClose();
      
      console.log('✅ [PAYMENT] Processo concluído com sucesso!');
    } catch (error) {
      console.error('❌ [PAYMENT] Erro ao processar pagamento:', error);
      showError('Erro ao processar pagamento. Tente novamente.');
    }
  };

  const handleRolloverInvoice = async () => {
    if (!selectedInvoice || !card) return;

    try {
      // Buscar dados da fatura em card_invoices
      const { data: invoiceRecord } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', card.id)
        .eq('cycle_start_date', selectedInvoice.startDate)
        .single();

      if (!invoiceRecord) {
        throw new Error('Registro da fatura não encontrado.');
      }

      const remainingAmount = invoiceRecord.total_amount - invoiceRecord.paid_amount;

      if (remainingAmount <= 0) {
        showError('Não há saldo restante para transferir.');
        return;
      }

      // Calcular data para a próxima fatura (primeiro dia do próximo ciclo)
      const nextCycleStartDate = new Date(selectedInvoice.endDate);
      nextCycleStartDate.setDate(nextCycleStartDate.getDate() + 1);
      const nextCycleDateStr = nextCycleStartDate.toISOString().split('T')[0];

      // Buscar categoria padrão para a despesa fantasma
      const { data: categories } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .or('type.eq.expense,type.eq.both')
        .order('name');

      const category = categories?.find(cat => cat.name.toLowerCase() === 'contas') || categories?.[0];

      // Criar despesa fantasma marcada com pending_next_invoice
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: `Saldo anterior - ${card.name}`,
          amount: remainingAmount,
          date: nextCycleDateStr,
          category_id: category?.id || null,
          category: category?.name || 'Saldo Anterior',
          payment_method: 'credit_card',
          card_id: card.id,
          status: 'confirmed',
          pending_next_invoice: true,
          organization_id: organization.id,
          user_id: user?.id,
          source: 'manual'
        });

      if (expenseError) {
        console.error('❌ Erro ao criar despesa fantasma:', expenseError);
        throw expenseError;
      }

      // Atualizar status da fatura atual para 'paid' (mesmo que parcial, foi "resolvida")
      await supabase
        .from('card_invoices')
        .update({
          status: 'paid',
          fully_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceRecord.id);

      // Recalcular limite disponível (a despesa fantasma já impacta o limite)
      // As despesas da fatura atual permanecem 'confirmed' (não temos status 'paid')
      const { data: newLimit, error: limitError } = await supabase
        .rpc('calculate_card_available_limit', { p_card_id: card.id });

      if (!limitError && newLimit !== null) {
        await supabase
          .from('cards')
          .update({ available_limit: newLimit })
          .eq('id', card.id);
      }

      success(`Saldo de ${formatCurrency(remainingAmount)} transferido para a próxima fatura!`);
      
      // Recarregar faturas
      await fetchInvoices();
      
      // Fechar modal
      setShowRolloverModal(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('❌ Erro ao transferir saldo:', error);
      showError('Erro ao transferir saldo. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl max-h-[90vh] sm:max-h-[95vh] border border-flight-blue/20 flex flex-col">
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-4 sm:p-5 md:p-6 pb-3 sm:pb-4 md:pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl">Faturas - {card.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Vence no dia {card.billing_day}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-gray-700 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flight-blue"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice, index) => {
                // Calcular data de fechamento (dia seguinte ao end_date) no fuso do Brasil
                const endDateBrazil = createBrazilDate(invoice.endDate);
                const closingDate = new Date(endDateBrazil.getFullYear(), endDateBrazil.getMonth(), endDateBrazil.getDate() + 1); // Dia de fechamento = end_date + 1
                
                // Calcular data de vencimento: billing_day pode ser no mês de fechamento ou no mês seguinte
                // Se o billing_day é menor que o dia de fechamento, o vencimento é no mês seguinte
                // Exemplo: fecha em 26/11, billing_day = 3 → vence em 03/12 (mês seguinte)
                // Exemplo: fecha em 07/12, billing_day = 11 → vence em 11/12 (mesmo mês)
                const billingDay = card.billing_day || 15;
                let dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth(), billingDay);
                
                // Se o billing_day é menor que o dia de fechamento, o vencimento é no mês seguinte
                if (billingDay < closingDate.getDate()) {
                  dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth() + 1, billingDay);
                }
                
                // Verificar se a fatura já fechou (data de fechamento <= hoje)
                // IMPORTANTE: Se fecha hoje, já consideramos como fechada
                const today = getBrazilToday();
                const closingDateNormalized = new Date(closingDate.getFullYear(), closingDate.getMonth(), closingDate.getDate());
                const hasClosed = closingDateNormalized <= today;
                
                // Verificar se é o ciclo atual usando fuso do Brasil
                // IMPORTANTE: Se a fatura já fechou, ela não pode ser o ciclo atual
                const invoiceStartDate = createBrazilDate(invoice.startDate);
                const invoiceStartDateNormalized = new Date(invoiceStartDate.getFullYear(), invoiceStartDate.getMonth(), invoiceStartDate.getDate());
                const currentCycleStart = currentCycle?.start ? createBrazilDate(currentCycle.start) : null;
                const currentCycleStartNormalized = currentCycleStart ? new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth(), currentCycleStart.getDate()) : null;
                
                // Se a fatura já fechou, ela não é mais o ciclo atual
                const isCurrentCycle = !hasClosed && currentCycleStartNormalized && invoiceStartDateNormalized.getTime() === currentCycleStartNormalized.getTime();
                
                // Verificar se é fatura futura (ainda não chegou no período)
                const isFuture = invoiceStartDateNormalized > today;
                
                // Mostrar botão apenas se a fatura fechou (não é atual e não é futura)
                const canMarkAsPaid = hasClosed && !isCurrentCycle && !isFuture;
                
                // Determinar label do status
                let statusLabel = '';
                if (isCurrentCycle) {
                  statusLabel = 'Fatura Atual';
                } else {
                  // Para faturas não atuais, usar o mês de VENCIMENTO (não o mês de fechamento)
                  // Exemplo: período 26/10 - 25/11, fecha 26/11, vence 03/12 → "Fatura de Dezembro"
                  // Exemplo: período 26/11 - 25/12, fecha 26/12, vence 03/01 → "Fatura de Janeiro"
                  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                  const monthName = monthNames[dueDate.getMonth()];
                  statusLabel = `Fatura de ${monthName}`;
                }
                
                const invoiceKey = `${invoice.startDate}-${invoice.endDate}`;
                const isExpanded = expandedInvoices.has(invoiceKey);
                const expenses = invoice.expenses || [];
                
                const toggleExpand = () => {
                  const newExpanded = new Set(expandedInvoices);
                  if (isExpanded) {
                    newExpanded.delete(invoiceKey);
                  } else {
                    newExpanded.add(invoiceKey);
                  }
                  setExpandedInvoices(newExpanded);
                };

                return (
                  <Card key={index} className={`border-2 ${isCurrentCycle ? 'border-flight-blue bg-flight-blue/5' : hasClosed ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold text-gray-900">
                              {statusLabel}
                            </CardTitle>
                            {expenses.length > 0 && (
                              <button
                                onClick={toggleExpand}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title={isExpanded ? 'Ocultar transações' : 'Ver transações'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(invoice.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(invoice.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {hasClosed && !isFuture && (
                              <span className="ml-2 text-yellow-600 font-medium">
                                • Fechou em {closingDate.toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {expenses.length > 0 && (
                              <span className="ml-2 text-gray-400">
                                • {expenses.length} {expenses.length === 1 ? 'transação' : 'transações'}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${isCurrentCycle ? 'text-flight-blue' : hasClosed ? 'text-yellow-700' : 'text-gray-900'}`}>
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>
                      </div>

                      {/* Lista de transações expandida */}
                      {isExpanded && expenses.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Transações ({expenses.length})
                          </h4>
                          <div className="space-y-1 max-h-96 overflow-y-auto">
                            {expenses
                              .sort((a, b) => new Date(a.date) - new Date(b.date))
                              .map((expense, expIndex) => {
                                const expenseDate = new Date(expense.date + 'T00:00:00');
                                const isInstallment = expense.installment_info && 
                                  expense.installment_info.total_installments > 1;
                                const displayAmount = expense.installmentAmount || expense.amount || 0;
                                const installmentText = isInstallment 
                                  ? `${expense.installment_info.current_installment}/${expense.installment_info.total_installments}`
                                  : '';
                                
                                return (
                                  <div
                                    key={expense.id || expIndex}
                                    className="flex items-center text-sm text-gray-700 py-1.5 px-2 hover:bg-gray-50 rounded transition-colors"
                                  >
                                    <span className="text-gray-600">
                                      {expenseDate.toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="mx-2 text-gray-400">-</span>
                                    <span className="flex-1 text-gray-900">
                                      {expense.description || 'Sem descrição'}
                                      {installmentText && (
                                        <span className="ml-2 text-gray-600">
                                          {installmentText}
                                        </span>
                                      )}
                                    </span>
                                    <span className="ml-auto font-semibold text-gray-900">
                                      {formatCurrency(displayAmount)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {canMarkAsPaid && (
                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowMarkAsPaidModal(true);
                            }}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Paga
                          </Button>
                        </div>
                      )}

                      {/* Botão para transferir saldo restante (somente para paid_partial) */}
                      {invoice.status === 'paid_partial' && (
                        <div className="flex justify-end mt-3 pt-3 border-t border-amber-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowRolloverModal(true);
                            }}
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Lançar saldo na próxima fatura
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-5 md:p-6 pt-3 sm:pt-4 md:pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            onClick={onClose}
            className="w-full sm:w-auto bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md min-h-[44px]"
          >
            Fechar
          </Button>
        </div>
      </div>
      
      {/* Modal para marcar fatura como paga */}
      <MarkInvoiceAsPaidModal
        isOpen={showMarkAsPaidModal}
        onClose={() => {
          setShowMarkAsPaidModal(false);
          setSelectedInvoice(null);
        }}
        onConfirm={handleMarkInvoiceAsPaid}
        invoice={selectedInvoice}
        card={card}
        organization={organization}
      />

      {/* Modal para transferir saldo restante */}
      <RolloverInvoiceModal
        isOpen={showRolloverModal}
        onClose={() => {
          setShowRolloverModal(false);
          setSelectedInvoice(null);
        }}
        onConfirm={handleRolloverInvoice}
        invoice={selectedInvoice}
        card={card}
        remainingAmount={selectedInvoice ? (selectedInvoice.total - (selectedInvoice.paid_amount || 0)) : 0}
      />
    </div>
  );
}

