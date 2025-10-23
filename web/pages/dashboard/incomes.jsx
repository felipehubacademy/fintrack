import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import IncomeModal from '../../components/IncomeModal';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import { 
  TrendingUp, 
  Plus, 
  Calendar, 
  DollarSign,
  Filter,
  Users,
  User,
  Edit,
  Trash2
} from 'lucide-react';

export default function IncomesDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [filter, setFilter] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    type: 'all' // all, individual, shared
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchIncomes();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, filter.month]);

  const fetchIncomes = async () => {
    setIsDataLoaded(false);
    try {
      setLoading(true);
      
      const startOfMonth = `${filter.month}-01`;
      const [year, month] = filter.month.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endOfMonth = `${filter.month}-${lastDay}`;

      let query = supabase
        .from('incomes')
        .select(`
          *,
          cost_center:cost_centers(name, color),
          income_splits(
            id,
            cost_center_id,
            cost_center:cost_centers(name, color),
            percentage,
            amount
          )
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;

      setIncomes(data || []);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar entradas:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncome = async (incomeData) => {
    try {
      if (incomeData.is_shared) {
        // Criar entrada compartilhada com splits
        const { data: income, error: incomeError } = await supabase
          .from('incomes')
          .insert({
            description: incomeData.description,
            amount: incomeData.amount,
            date: incomeData.date,
            category: incomeData.category,
            is_shared: true,
            status: 'confirmed',
            organization_id: organization.id,
            user_id: orgUser.id
          })
          .select()
          .single();

        if (incomeError) throw incomeError;

        // Criar splits
        const { error: splitsError } = await supabase
          .from('income_splits')
          .insert(
            incomeData.splits.map(split => ({
              income_id: income.id,
              cost_center_id: split.cost_center_id,
              percentage: split.percentage,
              amount: split.amount
            }))
          );

        if (splitsError) throw splitsError;
      } else {
        // Criar entrada individual
        const { error } = await supabase
          .from('incomes')
          .insert({
            description: incomeData.description,
            amount: incomeData.amount,
            date: incomeData.date,
            category: incomeData.category,
            cost_center_id: incomeData.cost_center_id,
            is_shared: false,
            status: 'confirmed',
            organization_id: organization.id,
            user_id: orgUser.id
          });

        if (error) throw error;
      }

      await fetchIncomes();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao criar entrada:', error);
      throw error;
    }
  };

  const handleUpdateIncome = async (incomeData) => {
    try {
      // Atualizar entrada
      const { error: updateError } = await supabase
        .from('incomes')
        .update({
          description: incomeData.description,
          amount: incomeData.amount,
          date: incomeData.date,
          category: incomeData.category,
          is_shared: incomeData.is_shared,
          cost_center_id: incomeData.is_shared ? null : incomeData.cost_center_id
        })
        .eq('id', editingIncome.id);

      if (updateError) throw updateError;

      // Se for compartilhada, atualizar splits
      if (incomeData.is_shared) {
        // Deletar splits existentes
        await supabase
          .from('income_splits')
          .delete()
          .eq('income_id', editingIncome.id);

        // Criar novos splits
        const { error: splitsError } = await supabase
          .from('income_splits')
          .insert(
            incomeData.splits.map(split => ({
              income_id: editingIncome.id,
              cost_center_id: split.cost_center_id,
              percentage: split.percentage,
              amount: split.amount
            }))
          );

        if (splitsError) throw splitsError;
      }

      await fetchIncomes();
      setShowModal(false);
      setEditingIncome(null);
    } catch (error) {
      console.error('Erro ao atualizar entrada:', error);
      throw error;
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;

    try {
      const { error } = await supabase
        .from('incomes')
        .update({ status: 'cancelled' })
        .eq('id', incomeId);

      if (error) throw error;

      await fetchIncomes();
    } catch (error) {
      console.error('Erro ao excluir entrada:', error);
    }
  };

  const openAddModal = () => {
    setEditingIncome(null);
    setShowModal(true);
  };

  const openEditModal = (income) => {
    setEditingIncome(income);
    setShowModal(true);
  };

  const getFilteredIncomes = () => {
    if (filter.type === 'all') return incomes;
    if (filter.type === 'individual') return incomes.filter(i => !i.is_shared);
    if (filter.type === 'shared') return incomes.filter(i => i.is_shared);
    return incomes;
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
          <Button onClick={() => router.push('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const filteredIncomes = getFilteredIncomes();
  const totalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
  const individualCount = incomes.filter(i => !i.is_shared).length;
  const sharedCount = incomes.filter(i => i.is_shared).length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Entradas Financeiras"
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
                <h2 className="text-lg font-semibold text-gray-900">Entradas Financeiras</h2>
                <p className="text-sm text-gray-600">Registre salários, vendas e outras receitas</p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="month"
                  value={filter.month}
                  onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                />
                <Button 
                  onClick={openAddModal}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Entrada
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total do Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {filteredIncomes.length} entrada(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Entradas Individuais
              </CardTitle>
              <User className="h-4 w-4 text-flight-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{individualCount}</div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Entradas Compartilhadas
              </CardTitle>
              <Users className="h-4 w-4 text-flight-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{sharedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <div className="flex space-x-2">
            {[
              { value: 'all', label: 'Todas' },
              { value: 'individual', label: 'Individuais' },
              { value: 'shared', label: 'Compartilhadas' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter({ ...filter, type: value })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter.type === value
                    ? 'bg-flight-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Incomes List */}
        {filteredIncomes.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma entrada encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Registre suas entradas financeiras para acompanhar sua receita
              </p>
              <Button onClick={openAddModal} className="bg-flight-blue hover:bg-flight-blue/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primeira Entrada
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredIncomes.map((income) => {
              return (
                <Card key={income.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{income.description}</h3>
                          <Badge className={income.is_shared ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                            {income.is_shared ? (
                              <><Users className="h-3 w-3 mr-1 inline" /> Compartilhada</>
                            ) : (
                              <><User className="h-3 w-3 mr-1 inline" /> Individual</>
                            )}
                          </Badge>
                          {income.category && (
                            <Badge className="bg-gray-100 text-gray-700">
                              {income.category}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(income.date).toLocaleDateString('pt-BR')}
                          </span>
                          
                          <span className="flex items-center text-green-600 font-semibold">
                            <DollarSign className="h-4 w-4 mr-1" />
                            R$ {Number(income.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          
                          {!income.is_shared && income.cost_center && (
                            <span className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-1" 
                                style={{ backgroundColor: income.cost_center.color || '#6B7280' }}
                              />
                              {income.cost_center.name}
                            </span>
                          )}
                        </div>

                        {/* Splits (se compartilhada) */}
                        {income.is_shared && income.income_splits && income.income_splits.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {income.income_splits.map((split) => (
                              <div 
                                key={split.id} 
                                className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full text-xs"
                              >
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: split.cost_center?.color || '#6B7280' }}
                                />
                                <span className="font-medium">{split.cost_center?.name}</span>
                                <span className="text-gray-500">{split.percentage}%</span>
                                <span className="text-green-600">
                                  R$ {Number(split.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => openEditModal(income)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteIncome(income.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Income Modal */}
        <IncomeModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingIncome(null);
          }}
          onSave={editingIncome ? handleUpdateIncome : handleCreateIncome}
          editingIncome={editingIncome}
          costCenters={costCenters || []}
        />
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

