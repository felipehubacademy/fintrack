import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function Chart({ expenses }) {
  // Calculate data for pie chart
  const totalFelipe = expenses
    .filter((e) => e.owner === 'Felipe')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalLeticia = expenses
    .filter((e) => e.owner === 'Letícia')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalShared = expenses
    .filter((e) => e.owner === 'Compartilhado')
    .reduce((sum, e) => sum + e.amount, 0);

  const data = [
    { name: 'Felipe', value: totalFelipe, color: '#3b82f6' },
    { name: 'Letícia', value: totalLeticia, color: '#ec4899' },
    { name: 'Compartilhado', value: totalShared, color: '#a855f7' },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Distribuição de Gastos</h2>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Sem dados para exibir
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Distribuição de Gastos</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `R$ ${value.toFixed(2)}`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

