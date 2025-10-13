import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function MonthCharts({ expenses, selectedMonth, onMonthChange, costCenters = [] }) {
  // Pizza 1: Divisão por Tipo (Cartão vs A Vista)
  const paymentTypeData = [
    {
      name: 'Cartões',
      value: expenses
        .filter(e => e.payment_method === 'credit_card' || e.source === 'pluggy')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    },
    {
      name: 'A Vista',
      value: expenses
        .filter(e => e.payment_method !== 'credit_card' && e.source !== 'pluggy')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    }
  ].filter(item => item.value > 0);

  // Pizza 2: Divisão por Centros de Custo (V2)
  const ownerData = costCenters.map(center => {
    const sharedExpenses = expenses.filter(e => e.owner === 'Compartilhado');
    const individualExpenses = expenses.filter(e => e.owner === center.name);
    
    let total = individualExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    // Adicionar parte compartilhada se for centro individual
    if (center.type === 'individual' && center.name !== 'Compartilhado') {
      const sharedTotal = sharedExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      total += sharedTotal * (center.split_percentage || 50) / 100;
    }
    
    return {
      name: center.name,
      value: total,
      color: center.color
    };
  }).filter(item => item.value > 0);

  const COLORS_TYPE = ['#3B82F6', '#10B981']; // Azul (Cartão), Verde (A Vista)
  const COLORS_OWNER = ['#3B82F6', '#EC4899']; // Azul (Felipe), Rosa (Letícia)

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Gráficos</h2>
          <div className="flex items-center">
            <label className="text-sm font-medium text-gray-700 mr-3">Mês:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-gray-600 text-center py-8">Nenhuma despesa confirmada para exibir</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Gráficos</h2>
        <div className="flex items-center">
          <label className="text-sm font-medium text-gray-700 mr-3">Mês:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pizza 1: Cartão vs A Vista */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Por Tipo de Pagamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_TYPE[index % COLORS_TYPE.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `R$ ${parseFloat(value).toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pizza 2: Por Owner (Consolidado) */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Por Responsável</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ownerData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {ownerData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS_OWNER[index % COLORS_OWNER.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `R$ ${parseFloat(value).toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

