import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { useState } from 'react';

export default function MonthlyComparison({ monthlyData = [] }) {
  const [selectedPeriod, setSelectedPeriod] = useState('12');
  // Debug logs
  console.log('🔍 [MONTHLYCOMPARISON DEBUG] monthlyData:', monthlyData);
  
  // Processar dados para o gráfico
  const chartData = monthlyData
    .slice(-parseInt(selectedPeriod)) // Pegar apenas os últimos N meses
    .map(month => ({
      ...month,
      cartoes: parseFloat(month.cartoes || 0),
      despesas: parseFloat(month.despesas || 0),
      entradas: parseFloat(month.entradas || 0),
      totalDespesas: parseFloat(month.cartoes || 0) + parseFloat(month.despesas || 0)
    }));

  // Tooltip customizado moderno
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const cartoes = data.cartoes || 0;
      const despesas = data.despesas || 0;
      const entradas = data.entradas || 0;
      const totalDespesas = cartoes + despesas;
      
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200/50 rounded-xl shadow-2xl">
          <div className="mb-3">
            <p className="font-semibold text-gray-900 text-sm mb-2">{label}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9CA3AF' }}></div>
                  <span className="text-xs text-gray-600">Crédito</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-4">
                  - R$ {cartoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6B7280' }}></div>
                  <span className="text-xs text-gray-600">À Vista</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-4">
                  - R$ {despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-flight-blue"></div>
                  <span className="text-xs text-gray-600">Entradas</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-4">
                  R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
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
        <div className="p-6 bg-flight-blue/5 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">Comparativo Mensal</h2>
          <p className="text-sm text-gray-600 mt-1">Evolução dos gastos nos últimos 12 meses</p>
        </div>
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-fog-mist to-feather-blue/50 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-flight-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="p-6 bg-flight-blue/5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Comparativo Mensal</h2>
              <p className="text-sm text-gray-600 mt-1">Evolução das transações nos últimos {selectedPeriod} meses</p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Período:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-transparent text-sm bg-white/50"
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráfico */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
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
              name="Crédito"
              stackId="despesas"
              fill="url(#cartoesGradient)"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="despesas" 
              name="À Vista"
              stackId="despesas"
              fill="url(#despesasGradient)"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="entradas" 
              name="Entradas"
              fill="url(#entradasGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="cartoesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9CA3AF" />
                <stop offset="100%" stopColor="#9CA3AF" />
              </linearGradient>
              <linearGradient id="despesasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6B7280" />
                <stop offset="100%" stopColor="#6B7280" />
              </linearGradient>
              <linearGradient id="entradasGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#207DFF" />
                <stop offset="100%" stopColor="#207DFF" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}