import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import StatsCard from '../../components/ui/StatsCard';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function MonthlyClosing() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  const { warning } = useNotificationContext();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [data, setData] = useState({
    incomes: [],
    expenses: [],
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    byCostCenter: {}
  });

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchMonthlyData();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);

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

      // Buscar expenses
      const { data: expensesData, error: expensesError } = await supabase
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
        .gte('date', startDate)
        .lte('date', endDate);

      if (expensesError) throw expensesError;

      // Calcular totais
      const totalIncome = (incomesData || []).reduce((sum, inc) => sum + Number(inc.amount), 0);
      const totalExpense = (expensesData || []).reduce((sum, exp) => sum + Number(exp.amount), 0);
      const balance = totalIncome - totalExpense;

      // Calcular por centro de custo
      const byCostCenter = {};
      
      // Processar incomes
      (incomesData || []).forEach(income => {
        if (income.is_shared && income.income_splits) {
          income.income_splits.forEach(split => {
            const ccId = split.cost_center_id;
            if (!byCostCenter[ccId]) {
              byCostCenter[ccId] = {
                id: ccId,
                name: split.cost_center?.name || 'Desconhecido',
                color: split.cost_center?.color || '#6B7280',
                income: 0,
                expense: 0,
                balance: 0
              };
            }
            byCostCenter[ccId].income += Number(split.amount);
          });
        } else if (income.cost_center_id) {
          const ccId = income.cost_center_id;
          if (!byCostCenter[ccId]) {
            byCostCenter[ccId] = {
              id: ccId,
              name: income.cost_center?.name || 'Desconhecido',
              color: income.cost_center?.color || '#6B7280',
              income: 0,
              expense: 0,
              balance: 0
            };
          }
          byCostCenter[ccId].income += Number(income.amount);
        }
      });

      // Processar expenses
      (expensesData || []).forEach(expense => {
        if (expense.is_shared && expense.expense_splits) {
          expense.expense_splits.forEach(split => {
            const ccId = split.cost_center_id;
            if (!byCostCenter[ccId]) {
              byCostCenter[ccId] = {
                id: ccId,
                name: split.cost_center?.name || 'Desconhecido',
                color: split.cost_center?.color || '#6B7280',
                income: 0,
                expense: 0,
                balance: 0
              };
            }
            byCostCenter[ccId].expense += Number(split.amount);
          });
        } else if (expense.cost_center_id) {
          const ccId = expense.cost_center_id;
          if (!byCostCenter[ccId]) {
            byCostCenter[ccId] = {
              id: ccId,
              name: expense.cost_center?.name || 'Desconhecido',
              color: expense.cost_center?.color || '#6B7280',
              income: 0,
              expense: 0,
              balance: 0
            };
          }
          byCostCenter[ccId].expense += Number(expense.amount);
        }
      });

      // Calcular balance para cada centro
      Object.keys(byCostCenter).forEach(ccId => {
        byCostCenter[ccId].balance = byCostCenter[ccId].income - byCostCenter[ccId].expense;
      });

      setData({
        incomes: incomesData || [],
        expenses: expensesData || [],
        totalIncome,
        totalExpense,
        balance,
        byCostCenter
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

  const costCenterArray = Object.values(data.byCostCenter);

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
                <p className="text-sm text-gray-600">Entradas vs Saídas por Responsável</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Month Navigator */}
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
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

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 w-full">
          <StatsCard
            title="Total de Entradas"
            value={`R$ ${data.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            description={`${data.incomes.length} entrada(s)`}
          />

          <StatsCard
            title="Total de Saídas"
            value={`R$ ${data.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingDown}
            color="text-red-600"
            bgColor="bg-red-50"
            borderColor="border-red-200"
            description={`${data.expenses.length} despesa(s)`}
          />

          <StatsCard
            title="Saldo do Mês"
            value={`R$ ${Math.abs(data.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color={data.balance >= 0 ? "text-blue-600" : "text-orange-600"}
            bgColor={data.balance >= 0 ? "bg-blue-50" : "bg-orange-50"}
            borderColor={data.balance >= 0 ? "border-blue-200" : "border-orange-200"}
            description={data.balance >= 0 ? 'Superávit' : 'Déficit'}
          />
        </div>

        {/* Breakdown por Centro de Custo */}
        {costCenterArray.length > 0 && (
          <Card className="border border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-flight-blue" />
                    Breakdown por Responsável
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Detalhamento de entradas e saídas por centro de custo
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costCenterArray
                  .sort((a, b) => b.expense - a.expense)
                  .map((cc) => (
                    <div key={cc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: cc.color }}
                          />
                          <span className="font-semibold text-gray-900">{cc.name}</span>
                        </div>
                        <Badge className={
                          cc.balance >= 0 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }>
                          {cc.balance >= 0 ? 'Positivo' : 'Negativo'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 mb-1">Entradas</div>
                          <div className="font-semibold text-green-700">
                            + R$ {cc.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-gray-600 mb-1">Saídas</div>
                          <div className="font-semibold text-red-700">
                            - R$ {cc.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-gray-600 mb-1">Saldo</div>
                          <div className={`font-bold ${
                            cc.balance >= 0 ? 'text-blue-700' : 'text-orange-700'
                          }`}>
                            R$ {Math.abs(cc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all"
                            style={{ 
                              width: `${cc.income > 0 ? Math.min((cc.expense / cc.income) * 100, 100) : 100}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>
                            {cc.income > 0 
                              ? `${((cc.expense / cc.income) * 100).toFixed(1)}% das entradas`
                              : '100% gasto'}
                          </span>
                          <span>
                            {cc.income > 0 && cc.expense > cc.income
                              ? `Déficit de ${(((cc.expense - cc.income) / cc.income) * 100).toFixed(1)}%`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {data.incomes.length === 0 && data.expenses.length === 0 && (
          <Card className="border border-gray-200">
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

