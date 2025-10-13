import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthlyComparison({ monthlyData }) {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Comparativo Mensal</h2>
        <p className="text-gray-600 text-center py-8">Dados insuficientes para comparação</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Comparativo Mensal</h2>
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `R$ ${value}`}
          />
          <Tooltip 
            formatter={(value) => `R$ ${parseFloat(value).toFixed(2)}`}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Legend />
          <Bar 
            dataKey="cartoes" 
            stackId="a"
            fill="#3B82F6" 
            name="Cartões"
          />
          <Bar 
            dataKey="despesas" 
            stackId="a"
            fill="#10B981" 
            name="A Vista"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

