import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import StatsCard from '../../components/ui/StatsCard';
import InvestmentGoalModal from '../../components/InvestmentGoalModal';
import InvestmentProgressCard from '../../components/InvestmentProgressCard';
import LoadingLogo from '../../components/LoadingLogo';
import ConfirmationModal from '../../components/ConfirmationModal';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import { 
  Target, 
  Plus, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function InvestmentsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  const { success, showError, warning } = useNotificationContext();
  
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchGoals();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const fetchGoals = async () => {
    setIsDataLoaded(false);
    try {
      setLoading(true);
      
      // Buscar goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      setGoals(goalsData || []);

      // Buscar contributions para cada goal
      if (goalsData && goalsData.length > 0) {
        const contributionsMap = {};
        
        for (const goal of goalsData) {
          const { data: contribData, error: contribError } = await supabase
            .from('investment_contributions')
            .select('*')
            .eq('goal_id', goal.id)
            .order('date', { ascending: false });

          if (!contribError) {
            contributionsMap[goal.id] = contribData || [];
          }
        }
        
        setContributions(contributionsMap);
      }

      setIsDataLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (goalData) => {
    try {
      const { error } = await supabase
        .from('investment_goals')
        .insert({
          ...goalData,
          organization_id: organization.id,
          user_id: orgUser.id
        });

      if (error) throw error;

      await fetchGoals();
      setShowGoalModal(false);
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      throw error;
    }
  };

  const handleUpdateGoal = async (goalData) => {
    try {
      const { error } = await supabase
        .from('investment_goals')
        .update(goalData)
        .eq('id', editingGoal.id);

      if (error) throw error;

      await fetchGoals();
      setShowGoalModal(false);
      setEditingGoal(null);
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  };

  const handleDeleteGoal = (goalId) => {
    setGoalToDelete(goalId);
    setShowConfirmModal(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;

    try {
      const { error } = await supabase
        .from('investment_goals')
        .update({ is_active: false })
        .eq('id', goalId);

      if (error) throw error;

      await fetchGoals();
      success('Meta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      showError('Erro ao excluir meta: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setGoalToDelete(null);
    }
  };

  const openAddGoalModal = () => {
    setEditingGoal(null);
    setShowGoalModal(true);
  };

  const openEditGoalModal = (goal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const openAddContributionModal = (goal) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setContributionDate(new Date().toISOString().split('T')[0]);
    setShowContributionModal(true);
  };

  const handleAddContribution = async () => {
    if (!selectedGoal || !contributionAmount || parseFloat(contributionAmount) <= 0) {
      warning('Valor inválido');
      return;
    }

    try {
      const { error } = await supabase
        .from('investment_contributions')
        .insert({
          goal_id: selectedGoal.id,
          amount: parseFloat(contributionAmount),
          date: contributionDate,
          confirmed: true
        });

      if (error) throw error;

      await fetchGoals();
      setShowContributionModal(false);
      setSelectedGoal(null);
      success('Aporte registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar aporte:', error);
      showError('Erro ao registrar aporte: ' + (error.message || 'Erro desconhecido'));
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
          <Button onClick={() => router.push('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.is_active !== false);
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  
  let totalInvested = 0;
  activeGoals.forEach(goal => {
    const goalContributions = contributions[goal.id] || [];
    totalInvested += goalContributions
      .filter(c => c.confirmed)
      .reduce((sum, c) => sum + Number(c.amount), 0);
  });

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Metas de Investimento"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      >
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Metas de Investimento</h2>
                <p className="text-sm text-gray-600">Acompanhe seus aportes e construa patrimônio</p>
              </div>
              <Button 
                onClick={openAddGoalModal}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 w-full">
          <StatsCard
            title="Metas Ativas"
            value={activeGoals.length}
            icon={Target}
            color="text-flight-blue"
            bgColor="bg-flight-blue/5"
            borderColor="border-flight-blue/20"
          />

          <StatsCard
            title="Total Investido"
            value={`R$ ${totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-50"
            borderColor="border-green-200"
          />

          <StatsCard
            title="Metas do Mês"
            value={`R$ ${totalTargetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={Target}
            color="text-flight-blue"
            bgColor="bg-flight-blue/5"
            borderColor="border-flight-blue/20"
          />
        </div>

        {/* Goals List */}
        {activeGoals.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma meta criada
              </h3>
              <p className="text-gray-600 mb-6">
                Crie metas de investimento e receba lembretes para construir seu patrimônio
              </p>
              <Button onClick={openAddGoalModal} className="bg-flight-blue hover:bg-flight-blue/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeGoals.map((goal) => (
              <InvestmentProgressCard
                key={goal.id}
                goal={goal}
                contributions={contributions[goal.id] || []}
                onEdit={() => openEditGoalModal(goal)}
                onDelete={() => handleDeleteGoal(goal.id)}
                onAddContribution={() => openAddContributionModal(goal)}
                costCenters={costCenters || []}
              />
            ))}
          </div>
        )}

        {/* Info Card */}
        {activeGoals.length > 0 && (
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">💡 Dica de Investimento</h3>
                  <p className="text-sm text-gray-700">
                    Mantenha a consistência! Investir regularmente, mesmo valores pequenos, 
                    é mais efetivo do que grandes aportes esporádicos. Os lembretes automáticos 
                    vão te ajudar a criar o hábito de investir.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </main>

      {/* Goal Modal */}
      <InvestmentGoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        onSave={editingGoal ? handleUpdateGoal : handleCreateGoal}
        editingGoal={editingGoal}
        costCenters={costCenters || []}
      />

      {/* Contribution Modal */}
      {showContributionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-green-50">
                <CardTitle className="text-gray-900 font-semibold">
                  Registrar Aporte
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowContributionModal(false)}>
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900">{selectedGoal?.name}</div>
                    <div className="text-sm text-gray-600">
                      Meta: R$ {Number(selectedGoal?.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Aporte *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Aporte
                  </label>
                  <input
                    type="date"
                    value={contributionDate}
                    onChange={(e) => setContributionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowContributionModal(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddContribution}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Registrar Aporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setGoalToDelete(null);
        }}
        onConfirm={confirmDeleteGoal}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir esta meta? Todos os aportes registrados também serão excluídos. Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
      
      <Footer />
      </Header>
    </>
  );
}

