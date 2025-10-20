import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { buildOwnerColorMap, buildCategoryColorMap, paymentMethodColor, normalizeKey, resolveColor } from '../lib/colors';

export default function MonthCharts({ expenses, selectedMonth, onMonthChange, costCenters = [], categories = [] }) {
  const [hoverCategory, setHoverCategory] = useState(null);
  // Debug logs
  console.log('🔍 [MONTHCHARTS DEBUG] expenses:', expenses);
  console.log('🔍 [MONTHCHARTS DEBUG] expenses.length:', expenses?.length);
  console.log('🔍 [MONTHCHARTS DEBUG] costCenters:', costCenters);
  
  const parseAmount = (raw) => {
    if (raw == null) return 0;
    if (typeof raw === 'number' && isFinite(raw)) return raw;
    let s = String(raw).trim();
    // remove tudo que não for dígito, separadores ou sinal
    s = s.replace(/[^0-9,.-]/g, '');
    // tratar formato BR: 1.234,56 -> 1234.56
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const canon = normalizeKey;

  // Pizza 1: Divisão por Categorias
  const categoryData = (expenses || []).reduce((acc, expense) => {
    if (!expense) return acc;
    const category = expense.category || 'Outros';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseAmount(expense.amount);
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Pizza 2: Divisão por Formas de Pagamento
  const paymentMethodData = (expenses || []).reduce((acc, expense) => {
    if (!expense) return acc;
    const method = expense.payment_method || 'other';
    if (!acc[method]) acc[method] = 0;
    acc[method] += parseAmount(expense.amount);
    return acc;
  }, {});

  const methodLabel = (code) => {
    switch (code) {
      case 'credit_card': return 'Crédito';
      case 'debit_card': return 'Débito';
      case 'pix': return 'PIX';
      case 'cash': return 'Dinheiro';
      case 'bank_transfer': return 'Transferência';
      case 'boleto': return 'Boleto';
      default: return 'Outros';
    }
  };

  const paymentChartData = Object.entries(paymentMethodData)
    .map(([code, value]) => ({ key: code, name: methodLabel(code), value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Pizza 3: Divisão por Responsável (com expense_splits)
  // Nova Estratégia:
  // 1) Despesas individuais: somar direto por owner
  // 2) Despesas compartilhadas COM splits: usar os splits personalizados
  // 3) Despesas compartilhadas SEM splits: usar fallback (cost_centers.split_percentage)
  
  const ownerTotals = {};
  const displayNameByCanon = {};

  // Determinar owners individuais conhecidos
  const individualCenters = (costCenters || []).filter(c => c && c.type === 'individual');
  
  // Criar mapa de cost_center_id -> name para lookup rápido
  const costCenterMap = {};
  individualCenters.forEach(cc => {
    costCenterMap[cc.id] = cc.name;
    displayNameByCanon[canon(cc.name)] = cc.name;
  });

  // Processar cada despesa
  (expenses || []).forEach(expense => {
    if (!expense) return;
    const amount = parseAmount(expense.amount);
    
    if (expense.split && expense.owner === 'Compartilhado') {
      // Despesa compartilhada
      if (expense.expense_splits && expense.expense_splits.length > 0) {
        // Usar splits personalizados
        expense.expense_splits.forEach(split => {
          const ccName = costCenterMap[split.cost_center_id] || split.cost_center?.name || 'Outros';
          const ccKey = canon(ccName);
          if (!ownerTotals[ccKey]) ownerTotals[ccKey] = 0;
          ownerTotals[ccKey] += parseAmount(split.amount);
          if (!displayNameByCanon[ccKey]) displayNameByCanon[ccKey] = ccName;
        });
      } else {
        // Usar fallback (cost_centers.split_percentage)
        individualCenters.forEach(cc => {
          const percentage = parseFloat(cc.split_percentage || 0);
          const share = (amount * percentage) / 100;
          const ccKey = canon(cc.name);
          if (!ownerTotals[ccKey]) ownerTotals[ccKey] = 0;
          ownerTotals[ccKey] += share;
        });
      }
    } else {
      // Despesa individual
      const ownerRaw = expense.owner || 'Outros';
      const ownerKey = canon(ownerRaw);
      if (!ownerTotals[ownerKey]) ownerTotals[ownerKey] = 0;
      ownerTotals[ownerKey] += amount;
      if (!displayNameByCanon[ownerKey]) displayNameByCanon[ownerKey] = ownerRaw;
    }
  });

  const ownerData = Object.entries(ownerTotals)
    .map(([nameKey, value]) => ({ name: displayNameByCanon[nameKey] || nameKey, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Mapas de cores vindos do backend quando disponíveis
  const ownerColorMap = buildOwnerColorMap(costCenters);
  const categoryColorMap = buildCategoryColorMap(categories);

  // Sem tooltip: informações serão mostradas no centro do donut ao passar o cursor

  // Componente de gráfico pizza profissional (donut + centro dinâmico em hover)
  const ProfessionalPieChart = ({ data, title }) => {
    const [activeIndex, setActiveIndex] = useState(null);
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const chartData = data.map(d => ({ ...d, total }));

    const hovered = activeIndex != null ? chartData[activeIndex] : null;

    const renderActiveShape = (props) => {
      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, midAngle } = props;
      const RAD = Math.PI / 180;
      const dx = Math.cos(-midAngle * RAD) * 6;
      const dy = Math.sin(-midAngle * RAD) * 6;
      return (
        <g shapeRendering="geometricPrecision">
          <Sector
            cx={cx + dx}
            cy={cy + dy}
            innerRadius={innerRadius}
            outerRadius={outerRadius + 6}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
            stroke={fill}
            strokeWidth={1}
          />
        </g>
      );
    };

    return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">{title}</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={120}
              paddingAngle={0}
              dataKey="value"
              stroke="#fff"
              strokeWidth={1.5}
              cornerRadius={0}
              style={{ strokeLinejoin: 'round' }}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={title === 'Por Responsável'
                    ? resolveColor(entry.name, ownerColorMap)
                    : title === 'Por Formas de Pagamento'
                      ? paymentMethodColor(entry.key || entry.name)
                      : resolveColor(entry.name, categoryColorMap)
                  }
                  style={{ opacity: 1 }}
                />
              ))}
            </Pie>
            {/* Sem tooltip: UX usa centro do donut */}
          </PieChart>
        </ResponsiveContainer>

        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
            <div className="text-center">
              <p className="text-[11px] font-semibold text-gray-900 max-w-[140px] mx-auto truncate">{hovered.name}</p>
              <p className="text-sm font-bold text-gray-900">{`R$ ${Number(hovered.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
              <p className="text-[10px] text-gray-500 font-medium">{total > 0 ? `${((hovered.value / total) * 100).toFixed(1)}% do total` : ''}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legendas removidas — informações disponíveis no tooltip ao passar o cursor */}
    </div>
  ); };

  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="p-6 bg-flight-blue/5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Análise do Mês</h2>
              <p className="text-sm text-gray-600 mt-1">Insights e tendências dos seus gastos</p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Mês:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white/50"
              />
            </div>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-fog-mist to-feather-blue/50 rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-flight-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma despesa encontrada</h3>
          <p className="text-gray-500 max-w-md mx-auto">Adicione despesas para visualizar análises detalhadas e insights sobre seus gastos.</p>
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
              <h2 className="text-xl font-bold text-gray-900">Análise do Mês</h2>
              <p className="text-sm text-gray-600 mt-1">Insights e tendências dos seus gastos</p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Mês:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onMonthChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white/50"
              />
            </div>
          </div>
        </div>
      </div>
      
          {/* Grid dos 3 gráficos pizza */}
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
        {/* Pizza 1: Por Categorias */}
        <ProfessionalPieChart data={categoryChartData} title="Por Categorias" />
        
        {/* Pizza 2: Por Formas de Pagamento */}
        <ProfessionalPieChart data={paymentChartData} title="Por Formas de Pagamento" />
        
        {/* Pizza 3: Por Responsável */}
        <ProfessionalPieChart data={ownerData} title="Por Responsável" />
      </div>
    </div>
  );
}