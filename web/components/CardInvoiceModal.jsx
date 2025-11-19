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
      let currentCycleStart = null;
      try {
        const { data: cycle } = await supabase.rpc('get_billing_cycle', {
          card_uuid: card.id,
          reference_date: refDate
        });
        if (cycle && cycle.length) {
          currentCycleStart = cycle[0].start_date;
          setCurrentCycle({ start: cycle[0].start_date, end: cycle[0].end_date });
        }
      } catch (error) {
        console.error('Erro ao buscar ciclo atual:', error);
      }

      // Buscar faturas da tabela card_invoices usando a view detalhada
      const { data: invoiceRecords, error: invoicesError } = await supabase
        .from('v_card_invoices_detailed')
        .select('*')
        .eq('card_id', card.id)
        .order('cycle_start_date', { ascending: true }); // Ordem crescente (mais antiga primeiro)

      if (invoicesError) {
        console.error('Erro ao buscar faturas:', invoicesError);
        showError?.('Erro ao carregar faturas');
        setInvoices([]);
        return;
      }

      if (!invoiceRecords || invoiceRecords.length === 0) {
        setInvoices([]);
        return;
      }

      // Para cada fatura, buscar suas despesas
      const invoicesWithExpenses = await Promise.all(
        invoiceRecords.map(async (invoice) => {
          const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('*')
            .eq('card_id', card.id)
            .eq('payment_method', 'credit_card')
            .eq('status', 'confirmed')
            .gte('date', invoice.cycle_start_date)
            .lte('date', invoice.cycle_end_date)
            .eq('pending_next_invoice', false) // Não incluir despesas fantasma
            .order('date', { ascending: true });

          if (expensesError) {
            console.error(`Erro ao buscar despesas da fatura ${invoice.cycle_start_date}:`, expensesError);
          }

          return {
            startDate: invoice.cycle_start_date,
            endDate: invoice.cycle_end_date,
            total: Number(invoice.total_amount || 0),
            status: invoice.status || 'pending',
            paid_amount: Number(invoice.paid_amount || 0),
            expenses: expenses || [],
            invoice_id: invoice.invoice_id,
            transaction_count: invoice.transaction_count || 0
          };
        })
      );

      setInvoices(invoicesWithExpenses);
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
      const { payment_method, bank_account_id, amount } = paymentData;
      
      // Determinar o status da fatura após o pagamento
      const totalInvoice = selectedInvoice.total;
      const isFullPayment = amount >= totalInvoice;
      const newStatus = isFullPayment ? 'paid' : 'paid_partial';


      let bankTransactionId = null;

      // 1. Criar transação bancária APENAS se payment_method === 'bank_account'
      if (payment_method === 'bank_account' && bank_account_id) {
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


        // Buscar a transação criada para pegar o ID
        const { data: bankTransaction } = await supabase
          .from('bank_account_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (!bankTransaction) {
          throw new Error('Transação bancária não encontrada após criação');
        }

        bankTransactionId = bankTransaction.id;
      } else {
      }

      // 2. Buscar ou criar registro da fatura em card_invoices
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
        // Atualizar registro existente
        const newPaidAmount = Number(existingInvoice.paid_amount || 0) + amount;
        const finalStatus = newPaidAmount >= totalInvoice ? 'paid' : 'paid_partial';

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
        
        invoiceRecord = updated;
      } else {
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
        
        invoiceRecord = created;
      }

      // 3. Registrar pagamento em card_invoice_payments
      const { error: paymentError } = await supabase
        .from('card_invoice_payments')
        .insert({
          invoice_id: invoiceRecord.id,
          bank_transaction_id: bankTransactionId, // Pode ser NULL se payment_method === 'other'
          amount,
          payment_date: getBrazilTodayString()
        });

      if (paymentError) {
        console.error('❌ [PAYMENT] Erro ao registrar pagamento:', paymentError);
        throw paymentError;
      }


      // 4. Recalcular limite do cartão usando a nova função V2
      
      const { data: newLimit, error: limitError } = await supabase
        .rpc('calculate_card_available_limit_v2', {
          p_card_id: card.id
        });

      if (limitError) {
        console.error('❌ [PAYMENT] Erro ao calcular limite:', limitError);
        throw limitError;
      }


      const { error: updateLimitError } = await supabase
        .from('cards')
        .update({ available_limit: newLimit })
        .eq('id', card.id);

      if (updateLimitError) {
        console.error('❌ [PAYMENT] Erro ao atualizar limite:', updateLimitError);
        throw updateLimitError;
      }


      if (isFullPayment) {
        success(`Fatura de ${formatCurrency(totalInvoice)} paga! Limite do cartão liberado.`);
      } else {
        success(`Pagamento parcial de ${formatCurrency(amount)} registrado. Limite de ${formatCurrency(amount)} liberado. Saldo restante: ${formatCurrency(totalInvoice - amount)}`);
      }
      
      // Recarregar faturas
      await fetchInvoices();
      
      // Fechar modal de confirmação
      setShowMarkAsPaidModal(false);
      setSelectedInvoice(null);
      
      // Fechar modal de faturas também
      onClose();
      
    } catch (error) {
      console.error('❌ [PAYMENT] Erro ao processar pagamento:', error);
      showError('Erro ao processar pagamento. Tente novamente.');
    }
  };

  const handleRolloverInvoice = async () => {
    if (!selectedInvoice || !card) return;

    try {
      
      // Buscar dados da fatura em card_invoices
      const { data: invoiceRecord, error: fetchError } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', card.id)
        .eq('cycle_start_date', selectedInvoice.startDate)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ [ROLLOVER] Erro ao buscar fatura:', fetchError);
        throw fetchError;
      }


      // Se não existe registro, criar um primeiro
      let finalInvoiceRecord = invoiceRecord;
      if (!invoiceRecord) {
        const { data: created, error: createError } = await supabase
          .from('card_invoices')
          .insert({
            card_id: card.id,
            cycle_start_date: selectedInvoice.startDate,
            cycle_end_date: selectedInvoice.endDate,
            total_amount: selectedInvoice.total,
            paid_amount: selectedInvoice.paid_amount || 0,
            status: selectedInvoice.status || 'pending',
            organization_id: organization.id,
            user_id: user?.id
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ [ROLLOVER] Erro ao criar fatura:', createError);
          throw createError;
        }
        
        finalInvoiceRecord = created;
      }

      const remainingAmount = finalInvoiceRecord.total_amount - (finalInvoiceRecord.paid_amount || 0);

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
        console.error('❌ [ROLLOVER] Erro ao criar despesa fantasma:', expenseError);
        throw expenseError;
      }


      // Atualizar status da fatura atual para 'paid' (mesmo que parcial, foi "resolvida")
      const { error: updateError } = await supabase
        .from('card_invoices')
        .update({
          status: 'paid',
          fully_paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', finalInvoiceRecord.id);

      if (updateError) {
        console.error('❌ [ROLLOVER] Erro ao atualizar status da fatura:', updateError);
        throw updateError;
      }


      // Recalcular limite disponível usando V2 (exclui faturas pagas)
      // A despesa fantasma já impacta o limite (está confirmada mas pending_next_invoice=true)
      const { data: newLimit, error: limitError } = await supabase
        .rpc('calculate_card_available_limit_v2', { p_card_id: card.id });

      if (limitError) {
        console.error('❌ [ROLLOVER] Erro ao calcular limite:', limitError);
      } else if (newLimit !== null) {
        const { error: updateLimitError } = await supabase
          .from('cards')
          .update({ available_limit: newLimit })
          .eq('id', card.id);

        if (updateLimitError) {
          console.error('❌ [ROLLOVER] Erro ao atualizar limite:', updateLimitError);
        } else {
        }
      }

      success(`Saldo de ${formatCurrency(remainingAmount)} transferido para a próxima fatura!`);
      
      // Recarregar faturas
      await fetchInvoices();
      
      // Fechar modal de rollover
      setShowRolloverModal(false);
      setSelectedInvoice(null);
      
      // Fechar modal de faturas também
      onClose();
      
    } catch (error) {
      console.error('❌ [ROLLOVER] Erro ao transferir saldo:', error);
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
                
                // Verificar se TODAS as faturas anteriores estão pagas
                // (faturas estão em ordem crescente: antiga → nova)
                const allPreviousInvoicesPaid = invoices
                  .slice(0, index) // Todas as faturas antes desta
                  .every(inv => inv.status === 'paid');
                
                // REGRAS DOS BOTÕES:
                // 1. Botão "Pagar" aparece se:
                //    - TODAS as faturas anteriores estão pagas E não é futura E não está paga
                const canShowPayButton = allPreviousInvoicesPaid && !isFuture && invoice.status !== 'paid';
                
                // 2. Botão "Lançar para próxima" aparece apenas se:
                //    - Fatura fechou E tem pagamento parcial
                const canShowRolloverButton = hasClosed && invoice.status === 'paid_partial';
                
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

                // Se a fatura está paga, mostrar visual simplificado
                if (invoice.status === 'paid') {
                  return (
                    <Card key={index} className="border border-gray-200 bg-gray-50 opacity-60">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-medium text-gray-700">
                                {statusLabel}
                              </CardTitle>
                              <span className="text-xs text-green-600 font-medium">✓ Paga</span>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-gray-600">
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

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
                          {invoice.status === 'paid_partial' && invoice.paid_amount > 0 && (
                            <div className="mt-1 text-xs space-y-0.5">
                              <p className="text-green-600 font-medium">
                                Pago: {formatCurrency(invoice.paid_amount)}
                              </p>
                              <p className="text-amber-600 font-medium">
                                Restante: {formatCurrency(invoice.total - invoice.paid_amount)}
                              </p>
                            </div>
                          )}
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

                      {/* Botões de ação */}
                      {(canShowPayButton || canShowRolloverButton) && (
                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                          {canShowPayButton && (
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
                              Pagar
                            </Button>
                          )}
                          {canShowRolloverButton && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowRolloverModal(true);
                              }}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Lançar saldo na próxima fatura
                            </Button>
                          )}
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

