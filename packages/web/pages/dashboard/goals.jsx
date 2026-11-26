import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import Header from '../../components/Header';
import LoadingLogo from '../../components/LoadingLogo';
import HelpTooltip from '../../components/ui/HelpTooltip';
import HelpCard from '../../components/ui/HelpCard';
import EmptyState from '../../components/ui/EmptyState';
import OnboardingOverlay from '../../components/ui/OnboardingOverlay_v2';
import GoalModal from '../../components/Goals/GoalModal';
import ContributionModal from '../../components/Goals/ContributionModal';
import GoalBadges from '../../components/Goals/GoalBadges';
import ContributionHistory from '../../components/Goals/ContributionHistory';
import GoalTimeline from '../../components/Goals/GoalTimeline';
import { calculateEarnedBadges, calculateStreak, calculateUserLevel, generateGamificationInsights } from '../../lib/gamification';
import tourService from '../../services/tourService';
import {
  Target,
  Plus,
  History,
  TrendingUp as TrendingUpIcon,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  Trophy,
  Flame,
  Edit,
  Trash2,
  PiggyBank,
  CreditCard,
  ShoppingBag,
  Wallet,
  Flag
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { t, formatMoney } from '@fintrack/shared/i18n';
import { appLocale } from '../../lib/utils';

const GOAL_TYPES = {
  emergency_fund: {
    get label() { return t('web.goals.emergencyFund'); },
    icon: PiggyBank,
    color: '#10B981',
    get description() { return t('web.goals.n36MonthsOfExpenses'); }
  },
  debt_payment: {
    get label() { return t('web.goals.payOffDebt'); },
    icon: CreditCard,
    color: '#EF4444',
    get description() { return t('web.goals.getRidOfDebt'); }
  },
  purchase: {
    get label() { return t('web.goals.plannedPurchase'); },
    icon: ShoppingBag,
    color: '#8B5CF6',
    get description() { return t('web.goals.carHomeTrip'); }
  },
  investment: {
    get label() { return t('web.shared.investing'); },
    icon: TrendingUp,
    color: '#3B82F6',
    get description() { return t('web.goals.buildWealth'); }
  },
  savings: {
    get label() { return t('web.goals.generalSavings'); },
    icon: Wallet,
    color: '#F59E0B',
    get description() { return t('web.goals.anythingYouWant'); }
  }
};

export default function GoalsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { organization, user: orgUser, loading: orgLoading, error: orgError } = useOrganization();
  const { success, error, warning } = useNotificationContext();
  
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelpCard, setShowHelpCard] = useState(true);
  const [activeTab, setActiveTab] = useState('goals'); // 'goals' ou 'history'
  const [expandedTimeline, setExpandedTimeline] = useState(null); // ID da meta com timeline expandida
  const [goalContributions, setGoalContributions] = useState({}); // Contribuições por meta
  const [allContributions, setAllContributions] = useState([]); // Todas as contribuições para gamificação
  const [earnedBadges, setEarnedBadges] = useState([]); // Badges conquistados
  const [userLevel, setUserLevel] = useState(null); // Nível do usuário
  const [gamificationInsights, setGamificationInsights] = useState([]); // Insights de gamificação

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchGoals();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  // Onboarding para primeira vez - usando persistência no banco
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!orgUser || !organization || loading) return;
      
      try {
        // Verificar no banco se o onboarding já foi completado
        const isCompleted = await tourService.isOnboardingCompleted('goals', orgUser.id);
        
        // Se não foi completado e não tem metas, mostrar onboarding
        if (!isCompleted && goals.length === 0) {
          setTimeout(() => setShowOnboarding(true), 500);
        }
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error);
        // Fallback para localStorage se houver erro no banco
        const hasSeenOnboarding = localStorage.getItem('onboarding_goals');
        if (!hasSeenOnboarding && goals.length === 0) {
          setTimeout(() => setShowOnboarding(true), 500);
        }
      }
    };
    
    checkOnboarding();
    
    // Mostrar help card apenas nas primeiras 3 visitas
    const helpCardViews = parseInt(localStorage.getItem('goals_help_card_views') || '0');
    if (helpCardViews >= 3) {
      setShowHelpCard(false);
    }
  }, [loading, goals.length, orgUser, organization]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error: goalsError } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;
      setGoals(data || []);

      // Buscar todas as contribuições para gamificação
      const { data: contributions, error: contribError } = await supabase
        .from('goal_contributions')
        .select('*')
        .in('goal_id', (data || []).map(g => g.id))
        .order('contribution_date', { ascending: false });

      if (contribError) throw contribError;
      setAllContributions(contributions || []);

      // Calcular gamificação
      const badges = calculateEarnedBadges(data || [], contributions || []);
      const level = calculateUserLevel(data || [], contributions || []);
      const insights = generateGamificationInsights(data || [], contributions || [], badges);

      setEarnedBadges(badges);
      setUserLevel(level);
      setGamificationInsights(insights);
    } catch (err) {
      console.error('Error fetching goals:', err);
      error(t('web.goals.couldnTLoadGoals'));
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (goal) => {
    const percentage = (goal.current_amount / goal.target_amount) * 100;
    return Math.min(percentage, 100);
  };

  const calculateProjection = (goal) => {
    const remaining = goal.target_amount - goal.current_amount;
    
    // Meta já atingida
    if (remaining <= 0) {
      return {
        type: 'completed',
        message: t('web.goals.goalReached'),
        monthsRemaining: 0,
        estimatedDate: null,
        requiredMonthly: 0
      };
    }

    // Tem contribuição mensal E data alvo
    if (goal.monthly_contribution > 0 && goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const today = new Date();
      const monthsDiff = Math.max(1, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24 * 30)));
      const requiredMonthly = remaining / monthsDiff;
      
      const isViable = goal.monthly_contribution >= requiredMonthly;
      
      return {
        type: 'full',
        monthsRemaining: Math.ceil(remaining / goal.monthly_contribution),
        estimatedDate: new Date(today.getTime() + (remaining / goal.monthly_contribution) * 30 * 24 * 60 * 60 * 1000),
        targetDate: targetDate,
        requiredMonthly: requiredMonthly,
        isViable: isViable,
        message: isViable 
          ? t('web.goals.youLlReachYourGoal', { p0: Math.ceil(remaining / goal.monthly_contribution) })
          : t('web.goals.headsUpToMakeIt', { p0: targetDate.toLocaleDateString(appLocale()), p1: formatMoney(requiredMonthly) })
      };
    }

    // Tem APENAS contribuição mensal (sem data alvo)
    if (goal.monthly_contribution > 0) {
      const monthsRemaining = Math.ceil(remaining / goal.monthly_contribution);
      const estimatedDate = new Date();
      estimatedDate.setMonth(estimatedDate.getMonth() + monthsRemaining);
      
      return {
        type: 'monthly_only',
        monthsRemaining: monthsRemaining,
        estimatedDate: estimatedDate,
        message: t('web.goals.expected', { p0: estimatedDate.toLocaleDateString(appLocale()) })
      };
    }

    // Tem APENAS data alvo (sem contribuição mensal)
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const today = new Date();
      const monthsDiff = Math.max(1, Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24 * 30)));
      const requiredMonthly = remaining / monthsDiff;
      
      return {
        type: 'date_only',
        monthsRemaining: monthsDiff,
        targetDate: targetDate,
        requiredMonthly: requiredMonthly,
        message: t('web.goals.saveMonthToMakeIt', { p0: formatMoney(requiredMonthly) })
      };
    }

    // Não tem nenhuma informação de projeção
    return {
      type: 'none',
      message: t('web.goals.setAMonthlyAmountOr')
    };
  };

  const getProgressColor = (percentage, goal) => {
    if (goal.status === 'completed') return '#10B981'; // Green
    if (percentage >= 75) return '#3B82F6'; // Blue
    if (percentage >= 50) return '#8B5CF6'; // Purple
    if (percentage >= 25) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const formatCurrency = (value) => {
    return `${formatMoney(Number(value || 0))}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(appLocale());
  };

  const handleSaveGoal = async (goalData) => {
    try {
      if (editingGoal) {
        // Update existing goal
        const { error: updateError } = await supabase
          .from('financial_goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (updateError) throw updateError;
        success(t('web.goals.goalUpdated'));
      } else {
        // Create new goal
        const { error: insertError } = await supabase
          .from('financial_goals')
          .insert([{
            ...goalData,
            organization_id: organization.id,
            status: 'active'
          }]);

        if (insertError) throw insertError;
        success(t('web.goals.goalCreated'));
      }

      setEditingGoal(null);
      fetchGoals();
    } catch (err) {
      console.error('Error saving goal:', err);
      error(t('web.goals.couldnTSaveTheGoal'));
      throw err;
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm(t('web.goals.deleteThisGoal'))) return;

    try {
      const { error: deleteError } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goalId);

      if (deleteError) throw deleteError;
      success(t('web.goals.goalDeleted'));
      fetchGoals();
    } catch (err) {
      console.error('Error deleting goal:', err);
      error(t('web.goals.couldnTDeleteTheGoal'));
    }
  };

  const handleSaveContribution = async (contributionData) => {
    try {
      // Insert contribution
      const { error: insertError } = await supabase
        .from('goal_contributions')
        .insert([{
          ...contributionData,
          organization_id: organization.id
        }]);

      if (insertError) throw insertError;

      // Update goal's current_amount
      const goal = goals.find(g => g.id === contributionData.goal_id);
      const newAmount = parseFloat(goal.current_amount || 0) + parseFloat(contributionData.amount);
      
      const { error: updateError } = await supabase
        .from('financial_goals')
        .update({ 
          current_amount: newAmount,
          status: newAmount >= parseFloat(goal.target_amount) ? 'completed' : 'active'
        })
        .eq('id', contributionData.goal_id);

      if (updateError) throw updateError;

      success(t('web.goals.moneyAdded'));
      fetchGoals();
      
      // Atualizar contribuições da meta se o timeline estiver expandido
      if (expandedTimeline === contributionData.goal_id) {
        fetchGoalContributions(contributionData.goal_id);
      }
    } catch (err) {
      console.error('Error saving contribution:', err);
      error(t('web.goals.couldnTAddTheMoney'));
      throw err;
    }
  };

  const fetchGoalContributions = async (goalId) => {
    try {
      const { data } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('contribution_date', { ascending: true });

      setGoalContributions(prev => ({
        ...prev,
        [goalId]: data || []
      }));
    } catch (err) {
      console.error('Error fetching contributions:', err);
    }
  };

  const toggleTimeline = async (goalId) => {
    if (expandedTimeline === goalId) {
      setExpandedTimeline(null);
    } else {
      setExpandedTimeline(goalId);
      if (!goalContributions[goalId]) {
        await fetchGoalContributions(goalId);
      }
    }
  };

  // Onboarding steps
  const onboardingSteps = [
    {
      title: t('web.goals.welcomeToGoals'),
      description: t('web.goals.setAndTrackWhatYou'),
      tip: t('web.goals.clearGoalsMakeSavingMuch'),
      icon: Flag,
      position: 'center'
    },
    {
      title: t('web.goals.goalTypes'),
      description: t('web.goals.pickOneOf5Types'),
      tip: t('web.goals.startWithAnEmergencyFund'),
      icon: Target,
      position: 'center'
    },
    {
      title: t('web.goals.smartProjections'),
      description: t('web.goals.weWorkOutWhenYou'),
      tip: t('web.goals.projectionsUpdateWithEveryDeposit'),
      icon: TrendingUp,
      position: 'center'
    },
    {
      title: t('web.goals.trackYourProgress'),
      description: t('web.goals.seeEachGoalSProgress'),
      tip: t('web.goals.smallSteadyDepositsBeatBig'),
      icon: Calendar,
      position: 'center'
    }
  ];

  // Calculate stats
  const totalGoals = goals.length;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const totalTargetAmount = goals
    .filter(g => g.status === 'active')
    .reduce((sum, g) => sum + parseFloat(g.target_amount || 0), 0);
  const totalCurrentAmount = goals
    .filter(g => g.status === 'active')
    .reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

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
          <Button onClick={() => router.push('/')}>{t('web.shared.backToHome2')}</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle={t('web.goals.goals')}
      >
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-4 md:py-8 space-y-4 md:space-y-8">
          
          {/* Header Actions */}
          <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-lg font-semibold text-gray-900">{t('web.goals.goals2')}</h2>
                <div className="flex items-center space-x-3">
                  <Button 
                    onClick={() => setShowGoalModal(true)}
                    className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('web.goals.newGoal')}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('goals')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'goals'
                    ? 'border-flight-blue text-flight-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>{t('web.goals.myGoals')}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'history'
                    ? 'border-flight-blue text-flight-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <History className="h-4 w-4" />
                  <span>{t('web.goals.history')}</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Conteúdo baseado na tab */}
          {activeTab === 'goals' ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  {t('web.goals.totalGoals')}
                </CardTitle>
                <div className="p-2 rounded-lg bg-flight-blue/10">
                  <Target className="h-4 w-4 text-flight-blue" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">{totalGoals}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('web.goals.activeDone', { activeGoals, completedGoals })}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {t('web.goals.overallProgress')}
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {overallProgress.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('web.goals.of', { p0: formatCurrency(totalCurrentAmount), p1: formatCurrency(totalTargetAmount) })}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Trophy className="h-4 w-4 mr-2" />
                  {t('web.goals.goalsReached')}
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <Trophy className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">{completedGoals}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('web.goals.success', { p0: totalGoals > 0 ? ((completedGoals / totalGoals) * 100).toFixed(0) : 0 })}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Flame className="h-4 w-4 mr-2" />
                  {t('web.goals.streak')}
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <Flame className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {calculateStreak(allContributions)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('web.goals.monthsInARow')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gamificação - Nível e Badges */}
          {goals.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Nível do Usuário */}
              <Card className="border border-gray-200 shadow-sm lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
                    <Trophy className="h-4 w-4 mr-2" />
                    {t('web.goals.yourLevel')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {userLevel?.level || t('web.goals.beginner')}
                    </div>
                    {userLevel?.nextLevel && (
                      <div className="text-sm text-gray-600 mt-1">
                        {t('web.goals.next', { nextLevel: userLevel.nextLevel })}
                      </div>
                    )}
                  </div>
                  {userLevel?.nextLevel && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{t('web.shared.progress')}</span>
                        <span>{userLevel.progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-flight-blue h-2 rounded-full transition-all duration-500"
                          style={{ width: `${userLevel.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Badges e Insights */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {/* Insights de Gamificação */}
                {gamificationInsights.length > 0 && (
                  <div className="space-y-2">
                    {gamificationInsights.map((insight, index) => (
                      <HelpCard
                        key={index}
                        type={insight.type}
                        title={insight.type === 'success' ? t('web.goals.niceWork') : insight.type === 'warning' ? t('web.goals.headsUp') : t('web.goals.tip')}
                        dismissible={false}
                      >
                        <p className="text-sm">{insight.message}</p>
                      </HelpCard>
                    ))}
                  </div>
                )}

                {/* Badges */}
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center justify-between">
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-2" />
                        {t('web.goals.badges')}
                      </div>
                      <span className="text-xs text-gray-500">
                        {t('web.goals.of13Badges', { length: earnedBadges.length })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GoalBadges earnedBadges={earnedBadges} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Help Card - Primeiras visitas */}
          {showHelpCard && goals.length > 0 && (
            <HelpCard
              type="tip"
              title={t('web.goals.howDoGoalsWork')}
              dismissible
              onDismiss={() => {
                setShowHelpCard(false);
                const views = parseInt(localStorage.getItem('goals_help_card_views') || '0');
                localStorage.setItem('goals_help_card_views', (views + 1).toString());
              }}
            >
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>{t('web.fixes.goalsHow1')}</li>
                <li>{t('web.fixes.goalsHow2')}</li>
                <li>{t('web.fixes.goalsHow3')}</li>
                <li>{t('web.fixes.goalsHow4')}</li>
              </ul>
            </HelpCard>
          )}

          {/* Goals List */}
          {goals.length === 0 ? (
            <EmptyState
              icon={Flag}
              title={t('web.goals.noGoalsYet')}
              description={t('web.goals.setWhatYouReSaving')}
              actionLabel={t('web.goals.createFirstGoal')}
              onAction={() => setShowGoalModal(true)}
              secondaryActionLabel={t('web.goals.seeTutorial')}
              onSecondaryAction={() => setShowOnboarding(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {goals.map((goal) => {
                const GoalIcon = GOAL_TYPES[goal.goal_type]?.icon || Flag;
                const goalColor = GOAL_TYPES[goal.goal_type]?.color || '#3B82F6';
                const progress = calculateProgress(goal);
                const progressColor = getProgressColor(progress, goal);
                const projection = calculateProjection(goal);

                return (
                  <Card key={goal.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: `${goalColor}20` }}
                          >
                            <GoalIcon className="h-6 w-6" style={{ color: goalColor }} />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              {goal.name}
                            </CardTitle>
                            <div className="text-sm text-gray-600 mt-1">
                              {GOAL_TYPES[goal.goal_type]?.label}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingGoal(goal);
                              setShowGoalModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Circle */}
                      <div className="flex items-center justify-between">
                        <div className="relative w-24 h-24">
                          <svg className="transform -rotate-90 w-24 h-24">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="#E5E7EB"
                              strokeWidth="8"
                              fill="none"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke={progressColor}
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold" style={{ color: progressColor }}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 ml-6 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('web.goals.now')}</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(goal.current_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('web.goals.goal')}</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(goal.target_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">{t('web.goals.left')}</span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(goal.target_amount - goal.current_amount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Smart Projection */}
                      <div className={`rounded-lg p-3 ${
                        projection.type === 'completed' ? 'bg-green-50 border border-green-200' :
                        projection.type === 'full' && !projection.isViable ? 'bg-orange-50 border border-orange-200' :
                        'bg-gray-50'
                      }`}>
                        <div className="space-y-2">
                          {/* Main message */}
                          <div className="flex items-start space-x-2">
                            <Calendar className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              projection.type === 'completed' ? 'text-green-600' :
                              projection.type === 'full' && !projection.isViable ? 'text-orange-600' :
                              'text-gray-600'
                            }`} />
                            <p className={`text-sm ${
                              projection.type === 'completed' ? 'text-green-700 font-semibold' :
                              projection.type === 'full' && !projection.isViable ? 'text-orange-700' :
                              'text-gray-700'
                            }`}>
                              {projection.message}
                            </p>
                          </div>

                          {/* Details based on type */}
                          {projection.type === 'full' && (
                            <div className="space-y-1 text-xs text-gray-600 pl-6">
                              <div className="flex justify-between">
                                <span>{t('web.goals.currentMonthlyAmount')}</span>
                                <span className="font-semibold">{t('web.goals.month', { p0: formatCurrency(goal.monthly_contribution) })}</span>
                              </div>
                              {!projection.isViable && (
                                <div className="flex justify-between text-orange-700">
                                  <span>{t('web.goals.needed')}</span>
                                  <span className="font-semibold">{t('web.goals.month', { p0: formatCurrency(projection.requiredMonthly) })}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>{t('web.goals.expectedFinish')}</span>
                                <span className="font-semibold">{projection.estimatedDate?.toLocaleDateString(appLocale())}</span>
                              </div>
                            </div>
                          )}

                          {projection.type === 'monthly_only' && (
                            <div className="space-y-1 text-xs text-gray-600 pl-6">
                              <div className="flex justify-between">
                                <span>{t('web.goals.monthlyAmount')}</span>
                                <span className="font-semibold">{t('web.goals.month', { p0: formatCurrency(goal.monthly_contribution) })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{t('web.goals.estimatedTime')}</span>
                                <span className="font-semibold">{projection.monthsRemaining} {projection.monthsRemaining === 1 ? t('web.goals.month2') : 'meses'}</span>
                              </div>
                            </div>
                          )}

                          {projection.type === 'date_only' && (
                            <div className="space-y-1 text-xs text-gray-600 pl-6">
                              <div className="flex justify-between">
                                <span>{t('web.goals.deadline')}</span>
                                <span className="font-semibold">{projection.targetDate?.toLocaleDateString(appLocale())}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{t('web.goals.monthsLeft')}</span>
                                <span className="font-semibold">{projection.monthsRemaining} {projection.monthsRemaining === 1 ? t('web.goals.month2') : 'meses'}</span>
                              </div>
                            </div>
                          )}

                          {projection.type === 'none' && (
                            <div className="text-xs text-gray-500 pl-6">
                              {t('web.goals.setAMonthlyAmountOr2')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 space-y-2">
                        <Button
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowContributionModal(true);
                          }}
                          className="w-full"
                          disabled={goal.status === 'completed'}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('web.goals.addMoney')}
                        </Button>
                        <Button
                          onClick={() => toggleTimeline(goal.id)}
                          variant="outline"
                          className="w-full"
                        >
                          <TrendingUpIcon className="h-4 w-4 mr-2" />
                          {expandedTimeline === goal.id ? t('web.shared.hide') : t('web.goals.see')} {t('web.goals.progress')}
                        </Button>
                      </div>

                      {/* Timeline Expandido */}
                      {expandedTimeline === goal.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <GoalTimeline 
                            goal={goal} 
                            contributions={goalContributions[goal.id] || []} 
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </>
          ) : (
            /* Tab de Histórico */
            <ContributionHistory organizationId={organization?.id} />
          )}

        </main>
      </Header>

      {/* Modals */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />

      <ContributionModal
        isOpen={showContributionModal}
        onClose={() => {
          setShowContributionModal(false);
          setSelectedGoal(null);
        }}
        onSave={handleSaveContribution}
        goal={selectedGoal}
      />

      {/* Onboarding Overlay */}
      <OnboardingOverlay
        steps={onboardingSteps}
        isOpen={showOnboarding}
        onComplete={async () => {
          setShowOnboarding(false);
          // Salvar no banco que o onboarding foi completado
          if (orgUser) {
            await tourService.markOnboardingCompleted('goals', orgUser.id);
          }
          // Fallback para localStorage
          localStorage.setItem('onboarding_goals', 'true');
        }}
        onSkip={async () => {
          setShowOnboarding(false);
          // NÃO salvar no banco se pular (para reaparecer na próxima vez)
          // Apenas salvar no localStorage como fallback
          localStorage.setItem('onboarding_goals', 'skipped');
        }}
        storageKey="goals"
      />
    </>
  );
}

