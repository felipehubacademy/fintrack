import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import LoadingLogo from '../../components/LoadingLogo';
import { 
  Target, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  LogOut,
  Settings,
  Bell
} from 'lucide-react';
import Link from 'next/link';
import BudgetModal from '../../components/BudgetModal';
import NotificationModal from '../../components/NotificationModal';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function BudgetsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, budgetCategories, loading: orgLoading, error: orgError } = useOrganization();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchData();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);
  
  const fetchData = async () => {
    setIsDataLoaded(false);
    try {
      await Promise.all([fetchBudgets(), fetchExpenses()]);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      if (!organization?.id) return;

      const [year, month] = selectedMonth.split('-');
      const monthNumber = parseInt(month);

      // Buscar orçamentos do mês selecionado
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:category_id (
            id,
            name,
            description
          )
        `)
        .eq('organization_id', organization.id)
        .eq('month_year', startOfMonth);

      if (budgetsError) {
        console.error('Error fetching budgets:', budgetsError);
        return;
      }

      // Calcular valores gastos para cada orçamento
      const budgetsWithSpent = await Promise.all(
        (budgetsData || []).map(async (budget) => {
          // Buscar despesas do mês para esta categoria (sem filtro por cost_center)
          const endOfMonth = new Date(parseInt(year), monthNumber, 0).toISOString().split('T')[0];

          const { data: expensesData, error: expensesError } = await supabase
            .from('expenses')
            .select('amount')
            .eq('organization_id', organization.id)
            .eq('status', 'confirmed')
            .eq('category_id', budget.category_id)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

          if (expensesError) {
            console.error('Error fetching expenses for budget:', expensesError);
          }

          const spent = (expensesData || []).reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

          return {
            id: budget.id,
            category: budget.category?.name || 'Sem categoria',
            category_id: budget.category_id, // Keep ID for editing
            amount: parseFloat(budget.limit_amount),
            spent: spent,
            month: selectedMonth,
            status: getBudgetStatus(spent, parseFloat(budget.limit_amount))
          };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(selectedMonth + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;
      if (!error) {
        setExpenses(data || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddBudget = async (budgetData) => {
    try {
      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;

      const { error } = await supabase
        .from('budgets')
        .insert({
          organization_id: organization.id,
          category_id: budgetData.category_id,
          limit_amount: parseFloat(budgetData.limit_amount),
          month_year: monthYear
        });

      if (error) throw error;

      await fetchBudgets();
      alert('Orçamento criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      alert('Erro ao criar orçamento');
    }
  };

  const handleEditBudget = async (budgetData) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          category_id: budgetData.category_id,
          limit_amount: parseFloat(budgetData.limit_amount)
        })
        .eq('id', budgetData.id);

      if (error) throw error;

      await fetchBudgets();
      alert('Orçamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      alert('Erro ao atualizar orçamento');
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('id', budgetId);

        if (error) throw error;

        await fetchBudgets();
        alert('Orçamento excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
        alert('Erro ao excluir orçamento');
      }
    }
  };

  const getBudgetStatus = (spent, amount) => {
    const percentage = (spent / amount) * 100;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'danger':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'danger':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (orgLoading || !isDataLoaded) {
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
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <Button onClick={() => router.push('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Orçamentos"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Gestão de Orçamentos</h2>
              <div className="flex items-center space-x-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-transparent"
                />
                <Button 
                  onClick={() => setShowBudgetModal(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Orçamento
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Orçado
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <Target className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {budgets.reduce((sum, b) => sum + b.amount, 0).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Gasto
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <TrendingDown className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {budgets.reduce((sum, b) => sum + b.spent, 0).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Restante
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <DollarSign className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {(budgets.reduce((sum, b) => sum + b.amount, 0) - budgets.reduce((sum, b) => sum + b.spent, 0)).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {budgets.map((budget) => {
            const percentage = (budget.spent / budget.amount) * 100;
            const status = getBudgetStatus(budget.spent, budget.amount);
            
            return (
              <Card key={budget.id} className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status)}
                      <div>
                        <CardTitle className="text-lg">{budget.category}</CardTitle>
                        <p className="text-sm text-gray-600">Orçamento da família</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingBudget(budget);
                          setShowBudgetModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteBudget(budget.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progresso</span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          status === 'danger' ? 'bg-red-500' :
                          status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Values */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Orçado:</span>
                      <span className="font-semibold">R$ {budget.amount.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Gasto:</span>
                      <span className="font-semibold">R$ {budget.spent.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm text-gray-600">Restante:</span>
                      <span className={`font-semibold ${
                        budget.amount - budget.spent < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        R$ {(budget.amount - budget.spent).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <Badge className={`${getStatusColor(status)} border-0`}>
                      {status === 'danger' ? 'Excedido' : 
                       status === 'warning' ? 'Atenção' : 'Dentro do Orçamento'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {budgets.length === 0 && (
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum orçamento definido</h3>
              <p className="text-gray-600 mb-6">Configure suas metas mensais para ter controle total sobre seus gastos.</p>
              <Button 
                onClick={() => setShowBudgetModal(true)}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Orçamento
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Budget Modal */}
      {showBudgetModal && (
        <BudgetModal
          isOpen={showBudgetModal}
          onClose={() => {
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
          onSave={editingBudget ? handleEditBudget : handleAddBudget}
          editingBudget={editingBudget}
          categories={budgetCategories}
          selectedMonth={selectedMonth}
        />
      )}

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
