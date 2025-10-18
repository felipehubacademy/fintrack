import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

export default function MonthlyComparison({ monthlyData = [] }) {
  // Debug logs
  console.log('🔍 [MONTHLYCOMPARISON DEBUG] monthlyData:', monthlyData);
  
  // Processar dados para o gráfico
  const chartData = monthlyData.map(month => ({
    ...month,
    cartoes: parseFloat(month.cartoes || 0),
    despesas: parseFloat(month.despesas || 0),
    total: parseFloat(month.cartoes || 0) + parseFloat(month.despesas || 0)
  }));

  // Tooltip customizado moderno
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const cartoes = data.cartoes || 0;
      const despesas = data.despesas || 0;
      const total = cartoes + despesas;
      
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200/50 rounded-xl shadow-2xl">
          <div className="mb-3">
            <p className="font-semibold text-gray-900 text-sm mb-2">{label}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-xs text-gray-600">Cartões</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  R$ {cartoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs text-gray-600">À Vista</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  R$ {despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Total</span>
                  <span className="text-sm font-bold text-gray-900">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h2 className="text-xl font-bold text-gray-900">Comparativo Mensal</h2>
          <p className="text-sm text-gray-600 mt-1">Evolução dos gastos nos últimos 12 meses</p>
        </div>
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum dado disponível</h3>
          <p className="text-gray-500 max-w-md mx-auto">Adicione despesas para visualizar o comparativo mensal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
      <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-50 to-purple-50">
        <h2 className="text-xl font-bold text-gray-900">Comparativo Mensal</h2>
        <p className="text-sm text-gray-600 mt-1">Evolução dos gastos nos últimos 12 meses</p>
      </div>
      
      <div className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={50}
              formatter={(value) => (
                <span className="text-sm text-gray-600 font-medium">{value}</span>
              )}
            />
            <Bar 
              dataKey="cartoes" 
              name="Cartões de Crédito"
              fill="url(#cartoesGradient)"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="despesas" 
              name="À Vista"
              fill="url(#despesasGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="cartoesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="despesasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}