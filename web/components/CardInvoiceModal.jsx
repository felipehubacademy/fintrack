import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, Calendar, CreditCard, ArrowRight } from 'lucide-react';

export default function CardInvoiceModal({ isOpen, onClose, card }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentCycle, setCurrentCycle] = useState(null);

  useEffect(() => {
    if (isOpen && card) {
      fetchInvoices();
    }
  }, [isOpen, card]);

  const fetchInvoices = async () => {
    if (!card || card.type !== 'credit') return;
    
    setLoading(true);
    try {
      const today = new Date();
      const refDate = today.toISOString().split('T')[0];

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] border border-flight-blue/20 flex flex-col">
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-6 pb-4 bg-flight-blue/5 rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">Faturas - {card.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Fecha no dia {card.billing_day} • Total: {formatCurrency(card.credit_limit || 0)}
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
        <div className="flex-1 overflow-y-auto p-6 pt-0">
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
                const isCurrentCycle = invoice.startDate === currentCycle?.start;
                
                return (
                  <Card key={index} className={`border-2 ${isCurrentCycle ? 'border-flight-blue bg-flight-blue/5' : 'border-gray-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">
                            {isCurrentCycle ? 'Fatura Atual' : `Fatura de ${formatDate(invoice.startDate)}`}
                          </CardTitle>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(invoice.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(invoice.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${isCurrentCycle ? 'text-flight-blue' : 'text-gray-900'}`}>
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <Button
            onClick={onClose}
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

