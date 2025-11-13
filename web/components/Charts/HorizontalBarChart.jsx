import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function HorizontalBarChart({ data }) {
  const formatCurrency = (value) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getColor = (status) => {
    if (status === 'above') return '#EF4444'; // Red
    if (status === 'below') return '#10B981'; // Green
    return '#F59E0B'; // Yellow
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">{data.category}</p>
        <div className="space-y-1">
          <div className="flex justify-between space-x-4">
            <span className="text-sm text-gray-600">Atual:</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(data.current)}
            </span>
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-sm text-gray-600">Média:</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(data.average)}
            </span>
          </div>
          <div className="flex justify-between space-x-4">
            <span className="text-sm text-gray-600">Variação:</span>
            <span className={`text-sm font-semibold ${
              data.status === 'above' ? 'text-red-600' : 
              data.status === 'below' ? 'text-green-600' : 
              'text-yellow-600'
            }`}>
              {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={data} 
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          type="number" 
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
          tickFormatter={formatCurrency}
        />
        <YAxis 
          type="category" 
          dataKey="category" 
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="current" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

