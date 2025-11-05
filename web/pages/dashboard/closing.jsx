import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  ArrowUpCircle,
  ArrowDownCircle,
  HelpCircle,
  CreditCard
} from 'lucide-react';

export default function MonthlyClosing() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError, isSoloUser } = useOrganization();
  const { warning } = useNotificationContext();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [openTooltip, setOpenTooltip] = useState(null);
  const [data, setData] = useState({
    incomes: [],
    expenses: [],
    totalIncome: 0, // Total da família inteira
    totalExpense: 0, // Total da família inteira
    balance: 0, // Saldo da família inteira
    creditInvoices: [] // Array com informações das faturas por cartão
  });

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchMonthlyData();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);

  // Fechar tooltip ao clicar fora em mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openTooltip && !event.target.closest('.relative.group')) {
        setOpenTooltip(null);
      }
    };
    
    if (openTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openTooltip]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-${lastDay}`;

      // Buscar incomes
      const { data: incomesData, error: incomesError } = await supabase
        .from('incomes')
        .select(`
          *,
          cost_center:cost_centers(id, name, color),
          income_splits(
            id,
            cost_center_id,
            cost_center:cost_centers(id, name, color),
            percentage,
            amount
          )
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', endDate);

      if (incomesError) throw incomesError;

      // Buscar todas as expenses (vamos filtrar depois)
      // Buscamos um range maior para capturar despesas de cartão que podem estar no mês anterior
      const extendedStartDate = new Date(parseInt(year), parseInt(month) - 2, 1).toISOString().split('T')[0];
      const { data: allExpensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          cost_center:cost_centers(id, name, color),
          expense_splits(
            id,
            cost_center_id,
            cost_center:cost_centers(id, name, color),
            percentage,
            amount
          )
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', extendedStartDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Buscar todos os cartões da organização para calcular faturas
      const { data: cardsData } = await supabase
        .from('cards')
        .select('id, name, closing_day, billing_day')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .eq('type', 'credit');

      // Separar despesas à vista das despesas de cartão
      const cashExpenses = (allExpensesData || []).filter(exp => 
        exp.payment_method !== 'credit_card' && 
        exp.date >= startDate && 
        exp.date <= endDate
      );

      // Para despesas de cartão, precisamos verificar se pertencem à fatura que fecha no mês selecionado
      // Exemplo: se closing_day = 15 e mês = novembro, a fatura fecha em 15/11 e inclui compras de 09/10 a 08/11
      const creditExpenses = [];
      const creditInvoices = []; // Array para armazenar informações das faturas por cartão
      
      try {
        if (cardsData && cardsData.length > 0) {
          // Para cada cartão, calcular qual fatura fecha no mês selecionado
          const invoiceCycles = {};
          
          for (const card of cardsData) {
            const closingDay = card.closing_day || card.billing_day;
            if (!closingDay) continue;
            
            // Calcular o período da fatura que fecha no mês selecionado
            // Exemplo: se closing_day = 15 e mês = novembro (2025-11)
            // A fatura fecha em 15/11, então o ciclo é:
            // - Início: dia após o último fechamento = 16/10 (se último fechamento foi 15/10)
            // - Fim: dia de fechamento = 15/11
            
            try {
              // Data de fechamento no mês selecionado
              const invoiceClosingDate = new Date(parseInt(year), parseInt(month) - 1, closingDay);
              
              // Data de início do ciclo (dia após o fechamento do mês anterior)
              const cycleStartDate = new Date(parseInt(year), parseInt(month) - 2, closingDay);
              cycleStartDate.setDate(cycleStartDate.getDate() + 1); // Dia após o fechamento anterior
              
              // Data de fim do ciclo (dia de fechamento)
              const cycleEndDate = new Date(invoiceClosingDate);
              
              // Se a data de fechamento já passou no mês atual, ajustar
              // Mas como estamos calculando para o mês selecionado, não precisa ajustar
              
              const startDateStr = cycleStartDate.toISOString().split('T')[0];
              const endDateStr = cycleEndDate.toISOString().split('T')[0];
              
              // Verificar se a fatura realmente fecha no mês selecionado
              // (não no mês seguinte)
              if (invoiceClosingDate.getMonth() + 1 === parseInt(month) && 
                  invoiceClosingDate.getFullYear() === parseInt(year)) {
                invoiceCycles[card.id] = {
                  startDate: startDateStr,
                  endDate: endDateStr,
                  cardName: card.name,
                  cardId: card.id
                };
              }
            } catch (err) {
              console.error(`Erro ao calcular ciclo do cartão ${card.id}:`, err);
              // Continuar para o próximo cartão mesmo se este falhar
            }
          }
          
          // Filtrar despesas de cartão que pertencem às faturas que fecham no mês selecionado
          // E calcular total por cartão
          const cardTotals = {};
          for (const exp of allExpensesData || []) {
            if (exp.payment_method === 'credit_card' && exp.card_id) {
              const cycle = invoiceCycles[exp.card_id];
              if (cycle && exp.date >= cycle.startDate && exp.date <= cycle.endDate) {
                creditExpenses.push(exp);
                // Acumular total por cartão
                if (!cardTotals[exp.card_id]) {
                  cardTotals[exp.card_id] = {
                    cardName: cycle.cardName,
                    total: 0
                  };
                }
                cardTotals[exp.card_id].total += parseFloat(exp.amount || 0);
              }
            }
          }
          
          // Converter cardTotals em array para o estado
          Object.keys(cardTotals).forEach(cardId => {
            creditInvoices.push({
              cardId,
              cardName: cardTotals[cardId].cardName,
              total: cardTotals[cardId].total
            });
          });
        } else {
          // Se não há cartões ou não conseguimos calcular ciclos, usar lógica antiga (por data)
          const fallbackCredit = (allExpensesData || []).filter(exp => 
            exp.payment_method === 'credit_card' && 
            exp.date >= startDate && 
            exp.date <= endDate
          );
          creditExpenses.push(...fallbackCredit);
        }
      } catch (invoiceError) {
        console.error('Erro ao processar faturas de cartão:', invoiceError);
        // Em caso de erro, usar fallback: incluir todas as despesas de cartão do mês
        const fallbackCredit = (allExpensesData || []).filter(exp => 
          exp.payment_method === 'credit_card' && 
          exp.date >= startDate && 
          exp.date <= endDate
        );
        creditExpenses.push(...fallbackCredit);
      }

      // Combinar despesas à vista e de cartão
      const allExpenses = [...cashExpenses, ...creditExpenses];

      // Dados sem filtro de privacidade (tudo visível para família)
      const allIncomes = incomesData || [];

      // Calcular totais da família inteira
      const totalIncome = allIncomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
      const totalExpense = allExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const balance = totalIncome - totalExpense;

      setData({
        incomes: allIncomes,
        expenses: allExpenses,
        totalIncome,
        totalExpense,
        balance,
        creditInvoices
      });

    } catch (error) {
      console.error('Erro ao buscar dados do mês:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    
    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    
    const newMonth = date.toISOString().slice(0, 7);
    setSelectedMonth(newMonth);
  };

  const getMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const exportToPDF = () => {
    warning('Funcionalidade de exportação PDF será implementada em breve!');
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <Button onClick={() => router.push('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const totalBalance = data.balance;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Fechamento Mensal"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fechamento Mensal</h2>
                <p className="text-sm text-gray-600">Análise completa de entradas e saídas por responsável</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Month Navigator */}
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                  <Button
                    onClick={() => changeMonth('prev')}
                    size="sm"
                    variant="ghost"
                    className="hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="px-4 py-1 flex items-center space-x-2 min-w-[200px] justify-center">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900 capitalize">
                      {getMonthName()}
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => changeMonth('next')}
                    size="sm"
                    variant="ghost"
                    className="hover:bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  onClick={exportToPDF}
                  variant="outline"
                  className="border-gray-300"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards - Resumo Geral com Tooltips */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full">
          {/* Card Total de Entradas */}
          <div className="relative group">
            <Card 
              className="border border-blue-200 bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'entradas' ? null : 'entradas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Total de Entradas
                </CardTitle>
                <div className="p-2 rounded-lg bg-flight-blue/10">
                  <TrendingUp className="h-4 w-4 text-flight-blue" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {data.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {data.totalIncome > 0 
                    ? `Total de entradas do mês`
                    : 'Nenhuma entrada neste mês'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'entradas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">{isSoloUser ? 'Entradas Individuais' : 'Divisão por Responsável'}</p>
              <p className="text-xs text-gray-500 mb-3">{isSoloUser ? 'Suas entradas do mês' : 'Divisão completa da família por responsável'}</p>
              <div className="space-y-2">
                {!isSoloUser && costCenters
                  .filter(cc => cc && cc.is_active !== false && !cc.is_shared)
                  .map((cc) => {
                    // Entradas individuais deste responsável
                    const individualTotal = data.incomes
                      .filter(i => !i.is_shared && i.cost_center_id === cc.id && i.status === 'confirmed')
                      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
                    
                    // Parte deste responsável nas entradas compartilhadas
                    const sharedTotal = data.incomes
                      .filter(i => i.is_shared && i.status === 'confirmed')
                      .flatMap(i => i.income_splits || [])
                      .filter(s => s.cost_center_id === cc.id)
                      .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    
                    const total = individualTotal + sharedTotal;
                    const percentage = data.totalIncome > 0 ? ((total / data.totalIncome) * 100).toFixed(1) : 0;
                    
                    return { cc, total, percentage, individualTotal, sharedTotal };
                  })
                  .filter(item => item.total > 0)
                  .map(({ cc, total, percentage, individualTotal, sharedTotal }) => (
                    <div key={cc.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cc.color || '#207DFF' }}
                          />
                          <span className="text-gray-700 font-medium">{cc.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{percentage}%</span>
                        </div>
                      </div>
                      {(individualTotal > 0 || sharedTotal > 0) && (
                        <div className="text-xs text-gray-500 ml-5">
                          {individualTotal > 0 && `Individual: R$ ${individualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          {individualTotal > 0 && sharedTotal > 0 && ' • '}
                          {sharedTotal > 0 && `${organization?.name || 'Família'}: R$ ${sharedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </div>
                      )}
                    </div>
                  ))}
                {isSoloUser && (
                  <p className="text-sm text-gray-500">Conta individual - apenas suas entradas</p>
                )}
                {!isSoloUser && costCenters.filter(cc => cc && cc.is_active !== false && !cc.is_shared).length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum dado disponível</p>
                )}
              </div>
            </div>
          </div>

          {/* Card Total de Saídas */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'saidas' ? null : 'saidas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Saídas
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <TrendingDown className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {data.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {data.totalExpense > 0 
                    ? `Total de saídas do mês`
                    : 'Nenhuma saída neste mês'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'saidas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">Divisão por Forma de Pagamento</p>
              <p className="text-xs text-gray-500 mb-3">{isSoloUser ? 'Suas despesas do mês' : 'Divisão completa da família'}</p>
              <div className="space-y-3">
                {(() => {
                  const confirmedExpenses = data.expenses.filter(e => e.status === 'confirmed');
                  
                  // Calcular total à vista (total da família)
                  const totalAVista = confirmedExpenses
                    .filter(e => 
                      e.payment_method === 'cash' || 
                      e.payment_method === 'debit_card' || 
                      e.payment_method === 'pix' || 
                      e.payment_method === 'bank_transfer' || 
                      e.payment_method === 'boleto' || 
                      e.payment_method === 'other'
                    )
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  
                  // Calcular total crédito (total da família)
                  const totalCredito = confirmedExpenses
                    .filter(e => e.payment_method === 'credit_card')
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  
                  const totalDespesas = totalAVista + totalCredito;
                  const porcentagemAVista = totalDespesas > 0 ? ((totalAVista / totalDespesas) * 100).toFixed(1) : 0;
                  const porcentagemCredito = totalDespesas > 0 ? ((totalCredito / totalDespesas) * 100).toFixed(1) : 0;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                          <span className="text-gray-700 font-medium">À Vista</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">R$ {Number(totalAVista).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{porcentagemAVista}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-gray-700 font-medium">Crédito</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">R$ {Number(totalCredito).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{porcentagemCredito}%</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Card Faturas de Cartão */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'faturas' ? null : 'faturas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Faturas de Cartão
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {data.creditInvoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {data.creditInvoices?.length > 0 
                    ? `${data.creditInvoices.length} ${data.creditInvoices.length === 1 ? 'fatura' : 'faturas'} que fecham no mês`
                    : 'Nenhuma fatura no mês'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'faturas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">Faturas por Cartão</p>
              <p className="text-xs text-gray-500 mb-3">Faturas que fecham no mês selecionado</p>
              <div className="space-y-3">
                {data.creditInvoices && data.creditInvoices.length > 0 ? (
                  data.creditInvoices.map((invoice) => {
                    const totalFaturas = data.creditInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
                    const percentage = totalFaturas > 0 ? ((invoice.total / totalFaturas) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={invoice.cardId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-700 font-medium">{invoice.cardName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">
                            R$ {Number(invoice.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-gray-500 ml-2">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma fatura fecha neste mês</p>
                )}
                {data.creditInvoices && data.creditInvoices.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">
                        R$ {data.creditInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Saldo Final */}
          <div className="relative group">
            <Card 
              className={`border shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer ${
                totalBalance >= 0 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}
              onClick={() => setOpenTooltip(openTooltip === 'saldo' ? null : 'saldo')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Saldo Final
                </CardTitle>
                <div className={`p-2 rounded-lg ${
                  totalBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <DollarSign className={`h-4 w-4 ${
                    totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className={`text-2xl font-bold mb-1 ${
                  totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalBalance >= 0 ? '+' : '-'} R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalBalance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'saldo' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Composição do Saldo</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-700">Total de Entradas</span>
                  <span className="text-gray-900 font-semibold text-blue-600">
                    R$ {data.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-700">Total de Saídas</span>
                  <span className="text-gray-900 font-semibold">
                    R$ {data.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm py-2">
                  <span className="text-gray-900 font-semibold">Saldo Final</span>
                  <span className={`font-bold ${
                    totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {totalBalance >= 0 ? '+' : '-'} R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Fechamento Mensal Unificado */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <span>Fechamento Mensal - {organization?.name || (isSoloUser ? 'Conta Individual' : 'Família')}</span>
                <p className="text-xs text-gray-500 font-normal mt-1">
                  {isSoloUser ? 'Resumo completo de suas entradas e saídas' : 'Resumo completo de entradas e saídas da família'}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                <span className="text-gray-600 font-medium">Total de Entradas:</span>
              </div>
              <span className="text-blue-600 font-bold text-lg">
                R$ {data.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <ArrowDownCircle className="h-5 w-5 text-gray-600" />
                <span className="text-gray-600 font-medium">Total de Saídas:</span>
              </div>
              <span className="text-gray-600 font-bold text-lg">
                R$ {data.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 pt-4 bg-gray-50 rounded-lg px-3 -mx-3">
              <span className="font-bold text-gray-900">Saldo Final:</span>
              <span className={`font-bold text-xl ${
                totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {totalBalance >= 0 ? '+' : '-'} R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>


        {/* Empty State */}
        {data.incomes.length === 0 && data.expenses.length === 0 && (
          <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum dado para este mês
              </h3>
              <p className="text-gray-600">
                Não há entradas ou despesas registradas para {getMonthName()}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </div>
  );
}
