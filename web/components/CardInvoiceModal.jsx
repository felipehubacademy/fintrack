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

      // Buscar ciclo atual
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
        console.error('Erro ao buscar ciclo:', error);
      }

      // Buscar todas as despesas confirmadas do cartão
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('payment_method', 'credit_card')
        .eq('card_id', card.id)
        .eq('status', 'confirmed')
        .order('date', { ascending: true });

      if (!expenses) return;

      // Agrupar despesas por fatura
      const invoicesMap = {};
      
      for (const expense of expenses) {
        if (expense.installment_info) {
          // É uma parcela
          const currentInstallment = expense.installment_info.current_installment;
          const totalInstallments = expense.installment_info.total_installments;
          const installmentAmount = expense.installment_info.installment_amount;
          
          // Calcular em qual fatura esta parcela cai
          let parcelDate = new Date(expense.date);
          
          // Avançar (currentInstallment - 1) meses para chegar na fatura desta parcela
          parcelDate.setMonth(parcelDate.getMonth() + (currentInstallment - 1));
          
          // Calcular qual é o ciclo dessa data
          const parcelRefDate = parcelDate.toISOString().split('T')[0];
          
          try {
            const { data: parcelCycle } = await supabase.rpc('get_billing_cycle', {
              card_uuid: card.id,
              reference_date: parcelRefDate
            });
            
            if (parcelCycle && parcelCycle.length) {
              const cycleKey = parcelCycle[0].start_date;
              
              if (!invoicesMap[cycleKey]) {
                invoicesMap[cycleKey] = {
                  startDate: parcelCycle[0].start_date,
                  endDate: parcelCycle[0].end_date,
                  total: 0,
                  expenses: []
                };
              }
              
              invoicesMap[cycleKey].total += Number(installmentAmount || expense.amount || 0);
              invoicesMap[cycleKey].expenses.push({
                ...expense,
                installmentAmount
              });
            }
          } catch (error) {
            console.error('Erro ao calcular ciclo da parcela:', error);
          }
        } else {
          // Despesa à vista ou sem parcelamento
          // Se está no ciclo atual, adiciona à fatura atual
          if (startDate && endDate && expense.date >= startDate && expense.date <= endDate) {
            const cycleKey = startDate;
            
            if (!invoicesMap[cycleKey]) {
              invoicesMap[cycleKey] = {
                startDate,
                endDate,
                total: 0,
                expenses: []
              };
            }
            
            invoicesMap[cycleKey].total += Number(expense.amount || 0);
            invoicesMap[cycleKey].expenses.push(expense);
          }
        }
      }

      // Converter para array e ordenar por data
      const invoicesArray = Object.values(invoicesMap).sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
      );

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

