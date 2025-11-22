import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import HelpTooltip from '../ui/HelpTooltip';

export default function GoalTimeline({ goal, contributions = [] }) {
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
      date: new Date(goal.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      valor: accumulated,
      meta: parseFloat(goal.target_amount)
    });

    // Adicionar cada contribuição
    sortedContributions.forEach(contribution => {
      accumulated += parseFloat(contribution.amount || 0);
      data.push({
        date: new Date(contribution.contribution_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
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
          date: projectionDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
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
        <p>Adicione contribuições para visualizar a evolução</p>
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
              <span className="font-medium">Valor:</span> R$ {data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
          {data.projecao !== undefined && (
            <p className="text-sm text-blue-600">
              <span className="font-medium">Projeção:</span> R$ {data.projecao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          )}
          {data.contribution && (
            <p className="text-sm text-green-600 mt-1">
              + R$ {data.contribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          Evolução da Meta
          <HelpTooltip content="Acompanhe o progresso ao longo do tempo. A linha azul mostra o valor acumulado e a linha tracejada mostra a projeção futura." />
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-flight-blue rounded-full" />
            <span className="text-gray-600">Valor Atual</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 border-2 border-flight-blue border-dashed rounded-full" />
            <span className="text-gray-600">Projeção</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">Meta</span>
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
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
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
            <strong>{contributions.length}</strong> {contributions.length === 1 ? 'contribuição realizada' : 'contribuições realizadas'}
            {goal.monthly_contribution > 0 && (
              <span className="ml-2">
                · Próxima contribuição esperada: <strong>R$ {goal.monthly_contribution.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

