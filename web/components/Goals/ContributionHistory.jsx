import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import HelpCard from '../ui/HelpCard';
import EmptyState from '../ui/EmptyState';
import HelpTooltip from '../ui/HelpTooltip';
import { Calendar, Download, Filter, TrendingUp, DollarSign, History } from 'lucide-react';

export default function ContributionHistory({ organizationId }) {
  const [contributions, setContributions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId, selectedGoal, selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar metas
      const { data: goalsData } = await supabase
        .from('financial_goals')
        .select('id, name, goal_type')
        .eq('organization_id', organizationId);

      setGoals(goalsData || []);

      // Buscar contribuições
      let query = supabase
        .from('goal_contributions')
        .select(`
          *,
          financial_goals (
            name,
            goal_type
          )
        `)
        .eq('organization_id', organizationId)
        .order('contribution_date', { ascending: false });

      // Filtro por meta
      if (selectedGoal !== 'all') {
        query = query.eq('goal_id', selectedGoal);
      }

      // Filtro por período
      if (selectedPeriod !== 'all') {
        const now = new Date();
        let startDate;
        
        if (selectedPeriod === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (selectedPeriod === 'quarter') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        } else if (selectedPeriod === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1);
        }
        
        if (startDate) {
          query = query.gte('contribution_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: contributionsData } = await query;
      setContributions(contributionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Estatísticas
  const totalContributed = contributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const avgContribution = contributions.length > 0 ? totalContributed / contributions.length : 0;
  const largestContribution = contributions.length > 0 
    ? Math.max(...contributions.map(c => parseFloat(c.amount || 0))) 
    : 0;

  const formatCurrency = (value) => {
    return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Meta', 'Valor', 'Observações'];
    const rows = contributions.map(c => [
      formatDate(c.contribution_date),
      c.financial_goals?.name || 'Meta removida',
      c.amount,
      c.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contribuicoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flight-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  Total Contribuído
                  <HelpTooltip content="Soma de todas as contribuições no período selecionado" />
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(totalContributed)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  Média por Aporte
                  <HelpTooltip content="Valor médio de cada contribuição" />
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(avgContribution)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  Maior Aporte
                  <HelpTooltip content="Maior contribuição única registrada" />
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(largestContribution)}
                </p>
              </div>
              <History className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por Meta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta
                </label>
                <select
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="all">Todas as metas</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue"
                >
                  <option value="all">Todo o período</option>
                  <option value="month">Este mês</option>
                  <option value="quarter">Últimos 3 meses</option>
                  <option value="year">Este ano</option>
                </select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Lista de Contribuições */}
      {contributions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nenhuma contribuição encontrada"
          description="Adicione contribuições às suas metas para visualizar o histórico aqui."
          actionLabel="Voltar para Metas"
          onAction={() => window.history.back()}
        />
      ) : (
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Histórico de Contribuições ({contributions.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {contribution.financial_goals?.name || 'Meta removida'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(contribution.contribution_date)}
                      </p>
                      {contribution.notes && (
                        <p className="text-xs text-gray-500 mt-1">
                          {contribution.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      + {formatCurrency(contribution.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

