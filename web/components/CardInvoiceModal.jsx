import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, Calendar, CreditCard, ArrowRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MarkInvoiceAsPaidModal from './MarkInvoiceAsPaidModal';
import { useOrganization } from '../hooks/useOrganization';
import { useNotificationContext } from '../contexts/NotificationContext';
import { getBrazilToday, createBrazilDate, isDateBeforeOrEqualToday } from '../lib/utils';

export default function CardInvoiceModal({ isOpen, onClose, card }) {
  const { organization, user, costCenters } = useOrganization();
  const { success, error: showError } = useNotificationContext();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
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

  const handleMarkInvoiceAsPaid = async (ownerData) => {
    if (!selectedInvoice || !card) return;

    try {
      const { cost_center_id, is_shared } = ownerData;
      
      // Buscar o nome do cost center ou organização
      let ownerName = null;
      if (cost_center_id) {
        const costCenter = costCenters?.find(cc => cc.id === cost_center_id);
        ownerName = costCenter?.name || null;
      } else if (is_shared) {
        ownerName = organization?.name || 'Família';
      }

      // Buscar categoria "Contas" ou usar primeira disponível
      const { data: categories } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .or('type.eq.expense,type.eq.both')
        .order('name');
      
      // Tentar encontrar categoria "Contas"
      let category = categories?.find(cat => 
        cat.name.toLowerCase() === 'contas'
      );
      
      // Se não encontrar, usar primeira disponível
      if (!category && categories && categories.length > 0) {
        category = categories[0];
      }

      // 1. Criar despesa representando o pagamento da fatura
      const invoiceDescription = `Fatura ${card.name} - ${formatDate(selectedInvoice.startDate)}`;
      
      const expenseData = {
        description: invoiceDescription,
        amount: selectedInvoice.total,
        date: getBrazilTodayString(),
        category_id: category?.id || null,
        category: category?.name || null,
        cost_center_id: cost_center_id || null,
        owner: ownerName,
        is_shared: is_shared,
        payment_method: 'bank_transfer', // Pagamento da fatura geralmente é por transferência/PIX
        card_id: null, // Não é mais despesa no cartão, é pagamento
        status: 'confirmed',
        organization_id: organization.id,
        user_id: user?.id,
        source: 'manual'
      };

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (expenseError) {
        console.error('❌ Erro ao criar expense da fatura:', expenseError);
        throw expenseError;
      }

      // 2. Se for compartilhado, criar splits
      if (is_shared && costCenters) {
        const activeCenters = costCenters.filter(cc => cc.is_active !== false && cc.user_id);
        const splitsToInsert = activeCenters.map(cc => ({
          expense_id: expense.id,
          cost_center_id: cc.id,
          percentage: parseFloat(cc.default_split_percentage || 50),
          amount: (selectedInvoice.total * parseFloat(cc.default_split_percentage || 50)) / 100
        }));

        if (splitsToInsert.length > 0) {
          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) {
            console.error('❌ Erro ao criar splits:', splitError);
            throw splitError;
          }
        }
      }

      // 3. Atualizar status de todas as despesas que compõem a fatura de 'confirmed' para 'paid'
      // Isso libera o limite do cartão porque o cálculo só considera despesas 'confirmed'
      const expenseIds = selectedInvoice.expenses.map(exp => exp.id);
      
      if (expenseIds.length > 0) {
        const { error: updateError } = await supabase
          .from('expenses')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .in('id', expenseIds);

        if (updateError) {
          console.error('❌ Erro ao atualizar status das despesas:', updateError);
          throw updateError;
        }
      }

      // 4. Recalcular available_limit do cartão (remover despesas pagas do cálculo)
      const { data: remainingExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('payment_method', 'credit_card')
        .eq('card_id', card.id)
        .eq('status', 'confirmed');

      const remainingUsed = (remainingExpenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const newAvailableLimit = Math.max(0, Number(card.credit_limit) - remainingUsed);

      await supabase
        .from('cards')
        .update({ available_limit: newAvailableLimit })
        .eq('id', card.id);

      success(`Fatura de ${formatCurrency(selectedInvoice.total)} marcada como paga! Limite do cartão liberado.`);
      
      // Recarregar faturas
      await fetchInvoices();
      
      // Fechar modal
      setShowMarkAsPaidModal(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('❌ Erro ao marcar fatura como paga:', error);
      showError('Erro ao marcar fatura como paga. Tente novamente.');
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
                        <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
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
        costCenters={costCenters || []}
        organization={organization}
      />
    </div>
  );
}

