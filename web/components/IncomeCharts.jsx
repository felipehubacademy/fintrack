import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { buildOwnerColorMap, buildIncomeCategoryColorMap, normalizeKey, resolveColor } from '../lib/colors';

export default function IncomeCharts({ incomes, expenses, selectedMonth, onMonthChange, costCenters = [], incomeCategories = [] }) {
  const [hoverCategory, setHoverCategory] = useState(null);
  
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

  const canon = normalizeKey;

  // Pizza 1: Entradas por Categorias
  const categoryData = (incomes || []).reduce((acc, income) => {
    if (!income) return acc;
    const category = income.category || 'Outros';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseAmount(income.amount);
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Pizza 2: Tipo de Entrada (Individual vs Compartilhada)
  const typeData = (incomes || []).reduce((acc, income) => {
    if (!income) return acc;
    const type = income.is_shared ? 'Compartilhada' : 'Individual';
    if (!acc[type]) acc[type] = 0;
    acc[type] += parseAmount(income.amount);
    return acc;
  }, {});

  const typeChartData = Object.entries(typeData)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Pizza 3: Entradas por Responsável
  const ownerTotals = {};
  const displayNameByCanon = {};

  const individualCenters = (costCenters || []).filter(c => c && c.is_active !== false && !c.is_shared);
  
  const costCenterMap = {};
  individualCenters.forEach(cc => {
    costCenterMap[cc.id] = cc.name;
    displayNameByCanon[canon(cc.name)] = cc.name;
  });

  (incomes || []).forEach(income => {
    if (!income) return;
    const amount = parseAmount(income.amount);
    
    if (income.is_shared && income.income_splits && income.income_splits.length > 0) {
      income.income_splits.forEach(split => {
        const ccName = costCenterMap[split.cost_center_id] || split.cost_center?.name || 'Outros';
        const ccKey = canon(ccName);
        
        if (!ownerTotals[ccKey]) ownerTotals[ccKey] = 0;
        ownerTotals[ccKey] += parseAmount(split.amount);
        if (!displayNameByCanon[ccKey]) displayNameByCanon[ccKey] = ccName;
      });
    } else if (income.is_shared) {
      individualCenters.forEach(cc => {
        const percentage = parseFloat(cc.split_percentage || 0);
        const share = (amount * percentage) / 100;
        const ccKey = canon(cc.name);
        
        if (!ownerTotals[ccKey]) ownerTotals[ccKey] = 0;
        ownerTotals[ccKey] += share;
      });
    } else {
      const ownerRaw = income.cost_center?.name || 'Outros';
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

  const ownerColorMap = buildOwnerColorMap(costCenters);
  const incomeCategoryColorMap = buildIncomeCategoryColorMap(incomeCategories);

  // Cores para tipo de entrada
  const getTypeColor = (name) => {
    return name === 'Compartilhada' ? '#8B5CF6' : '#10B981';
  };

  // Dados para o gráfico de Balanço (Entradas, Despesas, Saldo)
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const totalIncomesCalc = (incomes || []).reduce((sum, i) => sum + parseAmount(i.amount), 0);
  const balance = totalIncomesCalc - totalExpenses;
  
  const balanceChartData = [
    { name: 'Entradas', value: totalIncomesCalc, fill: '#207DFF' },
    { name: 'Despesas', value: totalExpenses, fill: '#6B7280' },
    { name: 'Saldo', value: Math.abs(balance), fill: balance >= 0 ? '#10B981' : '#EF4444' }
  ].filter(item => item.value > 0);

  // Componente específico para o gráfico de Balanço
  const BalancePieChart = () => {
    const [activeIndex, setActiveIndex] = useState(null);
    const total = balanceChartData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const chartData = balanceChartData.map(d => ({ ...d, total }));

    // Sempre mostrar o maior valor quando não houver hover
    const defaultDisplay = chartData.length > 0 ? chartData[0] : null;
    const hovered = activeIndex != null ? chartData[activeIndex] : defaultDisplay;

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
        <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Balanço do Mês</h3>
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
                    fill={entry.fill}
                    style={{ opacity: 1 }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {hovered && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
              <div className="text-center">
                <p className="text-[11px] font-semibold text-gray-900 max-w-[140px] mx-auto truncate">{hovered.name}</p>
                <p className="text-sm font-bold text-gray-900">
                  {hovered.name === 'Despesas' ? '-' : ''} R$ {Number(hovered.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-500 font-medium">{total > 0 ? `${((hovered.value / total) * 100).toFixed(1)}% do total` : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ProfessionalPieChart = ({ data, title }) => {
    const [activeIndex, setActiveIndex] = useState(null);
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const chartData = data.map(d => ({ ...d, total }));

    // Sempre mostrar o maior valor quando não houver hover
    const defaultDisplay = chartData.length > 0 ? chartData[0] : null; // Maior valor já vem ordenado
    const hovered = activeIndex != null ? chartData[activeIndex] : defaultDisplay;

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
                  fill={title === 'Entradas por Responsável'
                    ? resolveColor(entry.name, ownerColorMap)
                    : title === 'Entradas por Categorias'
                      ? resolveColor(entry.name, incomeCategoryColorMap)
                      : resolveColor(entry.name, incomeCategoryColorMap)
                  }
                  style={{ opacity: 1 }}
                />
              ))}
            </Pie>
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
    </div>
  ); };

  if (!incomes || incomes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Grid dos 3 gráficos pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
        {/* Pizza 1: Por Categorias */}
        <ProfessionalPieChart data={categoryChartData} title="Entradas por Categorias" />
        
        {/* Pizza 2: Por Responsável */}
        <ProfessionalPieChart data={ownerData} title="Entradas por Responsável" />
        
        {/* Pizza 3: Balanço do Mês */}
        {balanceChartData.length > 0 && <BalancePieChart />}
      </div>
    </div>
  );
}

