import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import StatsCard from '../../components/ui/StatsCard';
import InvestmentModal from '../../components/InvestmentModal';
import LoadingLogo from '../../components/LoadingLogo';
import ConfirmationModal from '../../components/ConfirmationModal';
import Header from '../../components/Header';
import NotificationModal from '../../components/NotificationModal';
import { 
  TrendingUp,
  Plus,
  DollarSign,
  PieChart,
  Calendar,
  Edit2,
  Trash2,
  Building2,
  Hash,
  ArrowUpRight,
  ArrowDownRight,
  LineChart
} from 'lucide-react';

const INVESTMENT_TYPE_LABELS = {
  stocks: 'Ações',
  funds: 'Fundos',
  treasury: 'Tesouro Direto',
  fixed_income: 'Renda Fixa',
  crypto: 'Criptomoedas',
  other: 'Outros'
};

const INVESTMENT_TYPE_ICONS = {
  stocks: '📈',
  funds: '💼',
  treasury: '🏛️',
  fixed_income: '📊',
  crypto: '₿',
  other: '💰'
};

export default function InvestmentsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, loading: orgLoading, error: orgError } = useOrganization();
  const { success, showError } = useNotificationContext();
  
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState(null);
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchInvestments();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const fetchInvestments = async () => {
    setIsDataLoaded(false);
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('organization_id', organization.id)
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      setInvestments(data || []);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar investimentos:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInvestment = async (investmentData) => {
    try {
      if (editingInvestment) {
        // Atualizar
        const { error } = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingInvestment.id);

        if (error) throw error;
        success('Investimento atualizado com sucesso!');
      } else {
        // Criar
        const { error } = await supabase
          .from('investments')
          .insert({
            ...investmentData,
            organization_id: organization.id,
            user_id: orgUser.id
          });

        if (error) throw error;
        success('Investimento adicionado com sucesso!');
      }

      await fetchInvestments();
      setShowInvestmentModal(false);
      setEditingInvestment(null);
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
      showError('Erro ao salvar investimento: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const handleDeleteInvestment = (investment) => {
    setInvestmentToDelete(investment);
    setShowConfirmModal(true);
  };

  const confirmDeleteInvestment = async () => {
    if (!investmentToDelete) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentToDelete.id);

      if (error) throw error;

      await fetchInvestments();
      success('Investimento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir investimento:', error);
      showError('Erro ao excluir investimento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setInvestmentToDelete(null);
    }
  };

  const openAddInvestmentModal = () => {
    setEditingInvestment(null);
    setShowInvestmentModal(true);
  };

  const openEditInvestmentModal = (investment) => {
    setEditingInvestment(investment);
    setShowInvestmentModal(true);
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

  // Cálculos
  const filteredInvestments = selectedType === 'all' 
    ? investments 
    : investments.filter(inv => inv.type === selectedType);

  const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.invested_amount || 0), 0);
  
  const investmentsWithCurrentValue = investments.filter(inv => inv.current_value !== null);
  const totalCurrentValue = investmentsWithCurrentValue.reduce((sum, inv) => sum + Number(inv.current_value || 0), 0);
  
  const totalReturn = totalCurrentValue - investmentsWithCurrentValue.reduce((sum, inv) => sum + Number(inv.invested_amount || 0), 0);
  const returnPercentage = investmentsWithCurrentValue.reduce((sum, inv) => sum + Number(inv.invested_amount || 0), 0) > 0
    ? (totalReturn / investmentsWithCurrentValue.reduce((sum, inv) => sum + Number(inv.invested_amount || 0), 0)) * 100
    : 0;

  // Agrupar por tipo
  const investmentsByType = investments.reduce((acc, inv) => {
    if (!acc[inv.type]) {
      acc[inv.type] = { count: 0, invested: 0, current: 0 };
    }
    acc[inv.type].count++;
    acc[inv.type].invested += Number(inv.invested_amount || 0);
    if (inv.current_value !== null) {
      acc[inv.type].current += Number(inv.current_value || 0);
    }
    return acc;
  }, {});

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Investimentos"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      >
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Carteira de Investimentos</h2>
                <p className="text-sm text-gray-600">Acompanhe todos os seus investimentos e evolução patrimonial</p>
              </div>
              <Button 
                onClick={openAddInvestmentModal}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Investimento
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full">
          <StatsCard
            title="Total Investido"
            value={`R$ ${totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="text-flight-blue"
            bgColor="bg-flight-blue/5"
            borderColor="border-flight-blue/20"
          />

          <StatsCard
            title="Valor Atual"
            value={investmentsWithCurrentValue.length > 0 
              ? `R$ ${totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : 'Não informado'}
            icon={TrendingUp}
            color={totalReturn >= 0 ? "text-green-600" : "text-red-600"}
            bgColor={totalReturn >= 0 ? "bg-green-50" : "bg-red-50"}
            borderColor={totalReturn >= 0 ? "border-green-200" : "border-red-200"}
          />

          <StatsCard
            title="Rentabilidade Total"
            value={investmentsWithCurrentValue.length > 0
              ? `${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%`
              : 'N/A'}
            description={investmentsWithCurrentValue.length > 0
              ? `R$ ${totalReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2, signDisplay: 'always' })}`
              : undefined}
            icon={totalReturn >= 0 ? ArrowUpRight : ArrowDownRight}
            color={totalReturn >= 0 ? "text-green-600" : "text-red-600"}
            bgColor={totalReturn >= 0 ? "bg-green-50" : "bg-red-50"}
            borderColor={totalReturn >= 0 ? "border-green-200" : "border-red-200"}
          />

          <StatsCard
            title="Investimentos Ativos"
            value={investments.length}
            icon={PieChart}
            color="text-purple-600"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
          />
        </div>

        {/* Filtros por tipo */}
        {investments.length > 0 && (
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedType === 'all'
                      ? 'bg-flight-blue text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos ({investments.length})
                </button>
                {Object.entries(investmentsByType).map(([type, data]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-flight-blue text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {INVESTMENT_TYPE_ICONS[type]} {INVESTMENT_TYPE_LABELS[type]} ({data.count})
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Investimentos */}
        {filteredInvestments.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedType === 'all' ? 'Nenhum investimento cadastrado' : 'Nenhum investimento deste tipo'}
              </h3>
              <p className="text-gray-600 mb-6">
                {selectedType === 'all' 
                  ? 'Comece a construir sua carteira de investimentos agora!'
                  : 'Adicione investimentos deste tipo à sua carteira'}
              </p>
              <Button onClick={openAddInvestmentModal} className="bg-flight-blue hover:bg-flight-blue/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Investimento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvestments.map((investment) => {
              const invested = Number(investment.invested_amount || 0);
              const current = investment.current_value !== null ? Number(investment.current_value) : null;
              const profit = current !== null ? current - invested : null;
              const profitPercentage = current !== null && invested > 0 ? ((current - invested) / invested) * 100 : null;

              return (
                <Card key={investment.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Info Principal */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-3xl">{INVESTMENT_TYPE_ICONS[investment.type]}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                              <Hash className="h-4 w-4 mr-1 text-gray-400" />
                              {investment.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {INVESTMENT_TYPE_LABELS[investment.type]}
                            </p>
                          </div>
                        </div>

                        {/* Detalhes */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Valor Investido</p>
                            <p className="text-sm font-semibold text-gray-900">
                              R$ {invested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          {current !== null && (
                            <>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Valor Atual</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  R$ {current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 mb-1">Rentabilidade</p>
                                <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 mb-1">Lucro/Prejuízo</p>
                                <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, signDisplay: 'always' })}
                                </p>
                              </div>
                            </>
                          )}

                          {investment.quantity && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Quantidade</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {Number(investment.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
                              </p>
                            </div>
                          )}

                          {investment.broker && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1 flex items-center">
                                <Building2 className="h-3 w-3 mr-1" />
                                Corretora
                              </p>
                              <p className="text-sm font-semibold text-gray-900">
                                {investment.broker}
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-gray-500 mb-1 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Data da Compra
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(investment.purchase_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        {investment.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600">{investment.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => openEditInvestmentModal(investment)}
                          className="p-2 text-gray-600 hover:text-flight-blue hover:bg-flight-blue/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvestment(investment)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </main>

      {/* Investment Modal */}
      <InvestmentModal
        isOpen={showInvestmentModal}
        onClose={() => {
          setShowInvestmentModal(false);
          setEditingInvestment(null);
        }}
        onSave={handleSaveInvestment}
        investment={editingInvestment}
      />

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
          setInvestmentToDelete(null);
        }}
        onConfirm={confirmDeleteInvestment}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir o investimento "${investmentToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
      
      </Header>
    </>
  );
}
