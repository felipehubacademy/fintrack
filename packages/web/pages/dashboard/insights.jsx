import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Header from '../../components/Header';
import LoadingLogo from '../../components/LoadingLogo';
import HelpTooltip from '../../components/ui/HelpTooltip';
import TrendLineChart from '../../components/Charts/TrendLineChart';
import MacroAreaChart from '../../components/Charts/MacroAreaChart';
import HorizontalBarChart from '../../components/Charts/HorizontalBarChart';
import FinancialScoreGauge from '../../components/Charts/FinancialScoreGauge';
import InsightCard from '../../components/Insights/InsightCard';
import { 
  calculateTrends, 
  detectPatterns, 
  calculateHealthScore, 
  predictSpending 
} from '../../lib/financialInsights';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Target,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function InsightsPage() {
  const router = useRouter();
  const { organization, user: orgUser, budgetCategories, loading: orgLoading, error: orgError } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [openTooltip, setOpenTooltip] = useState(null);

  // Helper para toggle de tooltip - sempre fecha o anterior ao abrir um novo
  const handleTooltipToggle = (tooltipId) => {
    if (openTooltip === tooltipId) {
      // Se clicar no mesmo, fecha
      setOpenTooltip(null);
    } else {
      // Se clicar em outro, abre o novo (fecha automaticamente o anterior)
      setOpenTooltip(tooltipId);
    }
  };

  // Fechar tooltip ao clicar fora em mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Não fechar se clicou no card ou no tooltip
      if (openTooltip && 
          !event.target.closest('.relative.group') && 
          !event.target.closest('[class*="absolute z-50"]')) {
        setOpenTooltip(null);
      }
    };
    
    if (openTooltip) {
      // Usar um pequeno delay para evitar conflito com o onClick do card
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [openTooltip]);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchData();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch last 6 months of expenses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDate = sixMonthsAgo.toISOString().split('T')[0];

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (expensesError) throw expensesError;

      // Fetch budgets for the same period
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:category_id (
            id,
            name,
            macro_group
          )
        `)
        .eq('organization_id', organization.id)
        .gte('month_year', startDate);

      if (budgetsError) throw budgetsError;

      // Enrich budgets with macro_group
      const enrichedBudgets = budgetsData.map(b => ({
        ...b,
        macro_group: b.category?.macro_group || 'needs',
        category_name: b.category?.name
      }));

      setExpenses(expensesData || []);
      setBudgets(enrichedBudgets || []);
    } catch (error) {
      console.error('Error fetching insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate all insights data
  const trendsData = useMemo(() => {
    if (!expenses.length || !budgets.length) return [];
    return calculateTrends(expenses, budgets, 6);
  }, [expenses, budgets]);

  const patterns = useMemo(() => {
    if (!expenses.length || !budgets.length) return [];
    return detectPatterns(expenses, budgets);
  }, [expenses, budgets]);

  const healthScore = useMemo(() => {
    if (!expenses.length || !budgets.length) return { total: 0, breakdown: {}, rating: 'Calculando...' };
    return calculateHealthScore({ budgets, expenses, goals: [], income: [] });
  }, [expenses, budgets]);

  const currentMonthExpenses = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return expenses.filter(e => e.date.startsWith(currentMonth));
  }, [expenses]);

  const prediction = useMemo(() => {
    if (!currentMonthExpenses.length) return null;
    const today = new Date();
    const daysRemaining = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    return predictSpending(currentMonthExpenses, daysRemaining);
  }, [currentMonthExpenses]);

  // Calculate spending waves (daily breakdown)
  const spendingWaves = useMemo(() => {
    if (!currentMonthExpenses.length) return [];
    
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyData = [];

    for (let day = 1; day <= Math.min(today.getDate(), daysInMonth); day++) {
      const dayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayExpenses = currentMonthExpenses.filter(e => e.date === dayStr);
      
      const needs = dayExpenses
        .filter(e => {
          const budget = budgets.find(b => b.category_id === e.category_id);
          return budget?.macro_group === 'needs';
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      const wants = dayExpenses
        .filter(e => {
          const budget = budgets.find(b => b.category_id === e.category_id);
          return budget?.macro_group === 'wants';
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      
      const investments = dayExpenses
        .filter(e => {
          const budget = budgets.find(b => b.category_id === e.category_id);
          return budget?.macro_group === 'investments';
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      dailyData.push({ day, needs, wants, investments });
    }

    return dailyData;
  }, [currentMonthExpenses, budgets]);

  // Calculate category comparison
  const categoryComparison = useMemo(() => {
    if (!expenses.length || !budgets.length) return [];

    const currentMonth = new Date().toISOString().slice(0, 7);
    const last3Months = [];
    
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last3Months.push(d.toISOString().slice(0, 7));
    }

    const categoryStats = {};

    budgetCategories.forEach(cat => {
      const currentExpenses = expenses
        .filter(e => e.date.startsWith(currentMonth) && e.category_id === cat.id)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const historicalExpenses = expenses
        .filter(e => last3Months.some(m => e.date.startsWith(m)) && e.category_id === cat.id)
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const average = historicalExpenses / 3;

      if (currentExpenses > 0 || average > 0) {
        const change = average > 0 ? ((currentExpenses - average) / average) * 100 : 0;
        const status = change > 20 ? 'above' : change < -20 ? 'below' : 'average';

        categoryStats[cat.id] = {
          category: cat.name,
          current: currentExpenses,
          average,
          change,
          status
        };
      }
    });

    return Object.values(categoryStats)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);
  }, [expenses, budgets, budgetCategories]);

  // Calculate KPIs
  const currentMonthBudgets = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return budgets.filter(b => b.month_year.startsWith(currentMonth));
  }, [budgets]);

  const totalBudgeted = useMemo(() => {
    return currentMonthBudgets.reduce((sum, b) => sum + parseFloat(b.limit_amount || 0), 0);
  }, [currentMonthBudgets]);

  const totalSpent = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [currentMonthExpenses]);

  const spentPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  // Compare with previous month
  const previousMonthExpenses = useMemo(() => {
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthKey = prevMonth.toISOString().slice(0, 7);
    return expenses.filter(e => e.date.startsWith(prevMonthKey));
  }, [expenses]);

  const previousMonthTotal = previousMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const monthChange = previousMonthTotal > 0 ? ((totalSpent - previousMonthTotal) / previousMonthTotal) * 100 : 0;

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

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Insights Financeiros"
      >
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-4 md:py-8 space-y-4 md:space-y-8">
          
          {/* Header Actions */}
          <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-lg font-semibold text-gray-900">Insights Financeiros</h2>
              </div>
            </CardHeader>
          </Card>
          
          {/* Section 1: Overview KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="relative group">
              <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTooltipToggle('gasto-mes');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Gasto no Mês
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gray-100">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 relative">
                  <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center text-xs space-x-2">
                    {monthChange >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-600" />
                        <span className="text-red-600">+{Math.abs(monthChange).toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-600" />
                        <span className="text-green-600">-{Math.abs(monthChange).toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-gray-500">vs mês anterior</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Tooltip */}
              <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'gasto-mes' ? 'visible' : 'invisible'}`}>
                <p className="text-sm font-semibold text-gray-900 mb-2">Gasto no Mês</p>
                <p className="text-xs text-gray-500">Total de despesas confirmadas no mês atual, comparado com o mês anterior</p>
              </div>
            </div>

            <div className="relative group">
              <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTooltipToggle('orcamento');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Orçamento
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-flight-blue/10">
                    <Target className="h-4 w-4 text-flight-blue" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 relative">
                  <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {spentPercentage.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    R$ {(totalBudgeted - totalSpent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} restante
                  </div>
                </CardContent>
              </Card>
              
              {/* Tooltip */}
              <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'orcamento' ? 'visible' : 'invisible'}`}>
                <p className="text-sm font-semibold text-gray-900 mb-2">Orçamento</p>
                <p className="text-xs text-gray-500">Percentual do orçamento total já utilizado neste mês</p>
              </div>
            </div>

            <div className="relative group">
              <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTooltipToggle('dias-restantes');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Dias Restantes
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 relative">
                  <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {prediction?.daysRemaining || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Média diária: R$ {(prediction?.dailyAverage || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
              
              {/* Tooltip */}
              <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'dias-restantes' ? 'visible' : 'invisible'}`}>
                <p className="text-sm font-semibold text-gray-900 mb-2">Dias Restantes</p>
                <p className="text-xs text-gray-500">Quantos dias faltam para o fim do mês e sua média de gastos diária</p>
              </div>
            </div>

            <div className="relative group">
              <Card className={`border shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer ${
                prediction?.pace === 'high' 
                  ? 'border-orange-200 bg-orange-50' 
                  : prediction?.pace === 'low'
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTooltipToggle('projecao');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Projeção
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${
                    prediction?.pace === 'high' 
                      ? 'bg-orange-100' 
                      : prediction?.pace === 'low'
                      ? 'bg-green-100'
                      : 'bg-gray-100'
                  }`}>
                    <AlertCircle className={`h-4 w-4 ${
                      prediction?.pace === 'high' 
                        ? 'text-orange-600' 
                        : prediction?.pace === 'low'
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`} />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 relative">
                  <HelpCircle className={`absolute bottom-2 right-2 h-3 w-3 opacity-50 group-hover:opacity-70 transition-opacity ${
                    prediction?.pace === 'high' 
                      ? 'text-orange-400' 
                      : prediction?.pace === 'low'
                      ? 'text-green-400'
                      : 'text-gray-400'
                  }`} />
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    R$ {(prediction?.projected || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                  <div className={`text-xs mt-1 ${
                    prediction?.pace === 'high' ? 'text-orange-600' : 
                    prediction?.pace === 'low' ? 'text-green-600' : 
                    'text-gray-600'
                  }`}>
                    Ritmo: {prediction?.pace === 'high' ? 'Acima' : prediction?.pace === 'low' ? 'Abaixo' : 'Normal'}
                  </div>
                </CardContent>
              </Card>
              
              {/* Tooltip */}
              <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'projecao' ? 'visible' : 'invisible'}`}>
                <p className="text-sm font-semibold text-gray-900 mb-2">Projeção</p>
                <p className="text-xs text-gray-500">Estimativa de quanto você vai gastar até o fim do mês, baseado no seu ritmo atual</p>
              </div>
            </div>
          </div>

          {/* Section 2: Trends Chart */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                Tendências por Macro (Últimos 6 meses)
                <HelpTooltip content="Evolução dos seus gastos nos últimos 6 meses, agrupados por macro categorias (Necessidades, Desejos, Investimentos)" wide />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <TrendLineChart data={trendsData} />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Patterns and Insights */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                Insights e Padrões Detectados
                <HelpTooltip content="Análise automática dos seus hábitos financeiros, identificando padrões, alertas e oportunidades de economia" wide />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patterns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patterns.slice(0, 6).map((pattern, index) => (
                    <InsightCard key={index} insight={pattern} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Ainda não há dados suficientes para gerar insights.</p>
                  <p className="text-sm mt-2">Continue registrando suas despesas!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Section 4: Category Comparison */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  Comparativo de Categorias
                  <HelpTooltip content="Comparação dos gastos por categoria entre este mês e o anterior, mostrando variações percentuais" wide />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {categoryComparison.length > 0 ? (
                    <HorizontalBarChart data={categoryComparison} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Sem dados de comparação
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Financial Health Score */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                  Score de Saúde Financeira
                  <HelpTooltip content="Pontuação de 0-100 que avalia sua saúde financeira baseada em orçamento, investimentos, reserva de emergência e mais" wide />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialScoreGauge 
                  score={healthScore.total} 
                  breakdown={healthScore.breakdown}
                />
              </CardContent>
            </Card>
          </div>

          {/* Section 6: Spending Waves */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                Ondas de Gastos (Mês Atual)
                <HelpTooltip content="Visualização das ondas de gastos ao longo do mês, mostrando picos e vales por macro categoria" wide />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {spendingWaves.length > 0 ? (
                  <MacroAreaChart data={spendingWaves} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Sem dados de gastos este mês
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </main>
      </Header>
    </>
  );
}

