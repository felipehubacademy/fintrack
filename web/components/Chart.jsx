import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Chart({ expenses }) {
  // Aggregate by category
  const categoryData = expenses
    .filter(e => e.status === 'confirmed')
    .reduce((acc, expense) => {
      const category = expense.category || 'Outros';
      const existing = acc.find(item => item.category === category);
      
      if (existing) {
        existing.value += parseFloat(expense.amount);
      } else {
        acc.push({
          category,
          value: parseFloat(expense.amount)
        });
      }
      
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  // Aggregate by owner
  const ownerData = [
    {
      name: 'Felipe',
      value: expenses
        .filter(e => e.status === 'confirmed' && (e.owner === 'Felipe' || e.owner === 'Compartilhado'))
        .reduce((sum, e) => {
          if (e.owner === 'Compartilhado') {
            return sum + (parseFloat(e.amount) / 2);
          }
          return sum + parseFloat(e.amount);
        }, 0)
    },
    {
      name: 'Letícia',
      value: expenses
        .filter(e => e.status === 'confirmed' && (e.owner === 'Leticia' || e.owner === 'Compartilhado'))
        .reduce((sum, e) => {
          if (e.owner === 'Compartilhado') {
            return sum + (parseFloat(e.amount) / 2);
          }
          return sum + parseFloat(e.amount);
        }, 0)
    }
  ].filter(item => item.value > 0);

  const COLORS = ['#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  if (expenses.filter(e => e.status === 'confirmed').length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Gráficos</h2>
        <p className="text-gray-600 text-center py-8">Nenhuma despesa confirmada para exibir</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Análise de Gastos</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value) => `R$ ${parseFloat(value).toFixed(2)}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Owner Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-4">Por Responsável</h3>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
