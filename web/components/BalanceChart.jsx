import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function BalanceChart({ expenses, incomes, selectedMonth }) {
  const parseAmount = (raw) => {
    if (raw == null) return 0;
    if (typeof raw === 'number' && isFinite(raw)) return raw;
    let s = String(raw).trim();
    s = s.replace(/[^0-9,.-]/g, '');
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const totalIncomes = (incomes || []).reduce((sum, i) => sum + parseAmount(i.amount), 0);
  const balance = totalIncomes - totalExpenses;
  
  // Calcular taxa de economia
  const savingsRate = totalIncomes > 0 ? (balance / totalIncomes) * 100 : 0;
  const savingsPercentage = Math.max(0, Math.min(100, savingsRate)); // Entre 0 e 100%

  // Dados para o gauge (semi-círculo)
  const gaugeData = [
    { name: 'economia', value: savingsPercentage, fill: '#10B981' },
    { name: 'restante', value: 100 - savingsPercentage, fill: '#F3F4F6' }
  ];

  if (totalExpenses === 0 && totalIncomes === 0) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
      <div className="p-6 bg-flight-blue/5 rounded-t-2xl">
        <h2 className="text-xl font-bold text-gray-900">Balanço do Mês</h2>
        <p className="text-sm text-gray-600 mt-1">Taxa de Economia</p>
      </div>
      <div className="p-6">
        {/* Gauge Chart */}
        <div className="relative" style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="90%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={120}
                dataKey="value"
                paddingAngle={0}
              >
                {gaugeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Indicador central */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-4xl font-bold" style={{ color: balance >= 0 ? '#10B981' : '#EF4444' }}>
              {savingsPercentage.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">Economizado</p>
          </div>
        </div>
        
        {/* Resumo abaixo do gráfico */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-flight-blue/5 rounded-lg border border-flight-blue/20">
            <p className="text-xs text-gray-600 mb-1">Total de Entradas</p>
            <p className="text-xl font-bold text-flight-blue">
              R$ {Number(totalIncomes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Total de Despesas</p>
            <p className="text-xl font-bold text-gray-900">
              R$ {Number(totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className={`text-center p-4 rounded-lg border ${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className="text-xs text-gray-600 mb-1">Saldo Líquido</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
              R$ {Number(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

