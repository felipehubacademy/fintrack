import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  needs: '#2563EB',
  wants: '#8B5CF6',
  investments: '#10B981'
};

const defaultData = [
  { key: 'needs', label: 'Necessidades', value: 0 },
  { key: 'wants', label: 'Desejos', value: 0 },
  { key: 'investments', label: 'Poupança / Investimentos', value: 0 }
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs text-gray-700">
      <p className="font-semibold">{item.label}</p>
      <p>{item.percentage.toFixed(1)}%</p>
      <p>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </div>
  );
}

export default function MacroPieChart({ summary = [] }) {
  const data = summary.length ? summary : defaultData;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key] || '#2563EB'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

