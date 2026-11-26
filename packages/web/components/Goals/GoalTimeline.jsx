import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import HelpTooltip from '../ui/HelpTooltip';
import { useI18n } from '../../contexts/I18nContext';
import { formatMoney } from '@fintrack/shared/i18n';
import { appLocale } from '../../lib/utils';
import { formatMoneyCompact } from '@fintrack/shared/i18n';

export default function GoalTimeline({ goal, contributions = [] }) {
  const { t } = useI18n();
  // Preparar dados para o gráfico
  const prepareChartData = () => {
    if (!goal || contributions.length === 0) return [];

    // Ordenar contribuições por data
    const sortedContributions = [...contributions].sort((a, b) => 
      new Date(a.contribution_date) - new Date(b.contribution_date)
    );

    // Criar pontos do gráfico
    const data = [];
    let accumulated = parseFloat(goal.current_amount || 0) - 
      sortedContributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    // Ponto inicial (quando a meta foi criada)
    data.push({
      date: new Date(goal.created_at).toLocaleDateString(appLocale(), { month: 'short', year: '2-digit' }),
      valor: accumulated,
      meta: parseFloat(goal.target_amount)
    });

    // Adicionar cada contribuição
    sortedContributions.forEach(contribution => {
      accumulated += parseFloat(contribution.amount || 0);
      data.push({
        date: new Date(contribution.contribution_date).toLocaleDateString(appLocale(), { month: 'short', year: '2-digit' }),
        valor: accumulated,
        meta: parseFloat(goal.target_amount),
        contribution: parseFloat(contribution.amount)
      });
    });

    // Adicionar projeção futura se houver contribuição mensal
    if (goal.monthly_contribution > 0 && accumulated < parseFloat(goal.target_amount)) {
      const remaining = parseFloat(goal.target_amount) - accumulated;
      const monthsToGoal = Math.ceil(remaining / goal.monthly_contribution);
      
      // Adicionar até 6 meses de projeção
      const projectionMonths = Math.min(monthsToGoal, 6);
      const lastDate = new Date(sortedContributions[sortedContributions.length - 1]?.contribution_date || goal.created_at);
      
      for (let i = 1; i <= projectionMonths; i++) {
        const projectionDate = new Date(lastDate);
        projectionDate.setMonth(projectionDate.getMonth() + i);
        
        accumulated += goal.monthly_contribution;
        data.push({
          date: projectionDate.toLocaleDateString(appLocale(), { month: 'short', year: '2-digit' }),
          projecao: Math.min(accumulated, parseFloat(goal.target_amount)),
          meta: parseFloat(goal.target_amount),
          isProjection: true
        });
      }
    }

    return data;
  };

  const chartData = prepareChartData();

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <p>{t('web.goalTimeline.addMoneyToSeeHow')}</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 mb-2">{data.date}</p>
          {data.valor !== undefined && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t('web.goalTimeline.amount')}</span> {formatMoney(data.valor)}
            </p>
          )}
          {data.projecao !== undefined && (
            <p className="text-sm text-blue-600">
              <span className="font-medium">{t('web.goalTimeline.projection')}</span> {formatMoney(data.projecao)}
            </p>
          )}
          {data.contribution && (
            <p className="text-sm text-green-600 mt-1">
              +{formatMoney(data.contribution)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {t('web.goalTimeline.goalProgress')}
          <HelpTooltip content={t('web.goalTimeline.trackProgressOverTimeThe')} />
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-flight-blue rounded-full" />
            <span className="text-gray-600">{t('web.shared.currentAmount')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-flight-blue border-dashed rounded-full" />
            <span className="text-gray-600">{t('web.goalTimeline.projection2')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">{t('web.goalTimeline.goal')}</span>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6B7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatMoneyCompact(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Linha da meta (horizontal) */}
            <ReferenceLine 
              y={parseFloat(goal.target_amount)} 
              stroke="#10B981" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            
            {/* Linha de valor acumulado */}
            <Line 
              type="monotone" 
              dataKey="valor" 
              stroke="#3B82F6" 
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            
            {/* Linha de projeção */}
            <Line 
              type="monotone" 
              dataKey="projecao" 
              stroke="#3B82F6" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#3B82F6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones */}
      {contributions.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-flight-blue rounded p-3">
          <p className="text-sm text-gray-700">
            <strong>{contributions.length}</strong> {contributions.length === 1 ? t('web.goalTimeline.depositMade') : t('web.goalTimeline.depositsMade')}
            {goal.monthly_contribution > 0 && (
              <span className="ml-2">
                {t('web.goalTimeline.nextDepositExpected')} <strong>{formatMoney(goal.monthly_contribution)}</strong>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

