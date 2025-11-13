import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  needs: '#2563EB',
  wants: '#8B5CF6',
  investments: '#10B981'
};

export default function MacroAreaChart({ data }) {
  const formatCurrency = (value) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;

    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-semibold text-gray-900 mb-2">Dia {label}</p>
        {payload.reverse().map((entry, index) => (
          <div key={index} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-gray-600">{entry.name}:</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total:</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorNeeds" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.needs} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.needs} stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorWants" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.wants} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.wants} stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="colorInvestments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.investments} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={COLORS.investments} stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="day" 
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="needs" 
          stackId="1"
          stroke={COLORS.needs} 
          fill="url(#colorNeeds)"
          name="Necessidades"
        />
        <Area 
          type="monotone" 
          dataKey="wants" 
          stackId="1"
          stroke={COLORS.wants} 
          fill="url(#colorWants)"
          name="Desejos"
        />
        <Area 
          type="monotone" 
          dataKey="investments" 
          stackId="1"
          stroke={COLORS.investments} 
          fill="url(#colorInvestments)"
          name="Investimentos"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

