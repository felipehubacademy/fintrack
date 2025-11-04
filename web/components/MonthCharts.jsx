import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { buildOwnerColorMap, buildCategoryColorMap, paymentMethodColor, normalizeKey, resolveColor } from '../lib/colors';
import { useResponsiveChart } from '../hooks/useResponsiveChart';

export default function MonthCharts({ expenses, costCenters = [], categories = [], organization = null, user = null }) {
  const [hoverCategory, setHoverCategory] = useState(null);
  // Sempre mostrar todos (não há mais filtro de privacidade)
  const viewMode = 'all';
  
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
  
  // Encontrar cost center do usuário
  const userCostCenter = costCenters.find(cc => cc.user_id === user?.id);

  // Pizza 1: Divisão por Categorias (com breakdown Individual vs Org)
  const categoryData = (expenses || []).reduce((acc, expense) => {
    if (!expense) return acc;
    const category = expense.category || 'Outros';
    
    if (!acc[category]) {
      acc[category] = { individual: 0, org: 0, total: 0 };
    }
    
    const amount = parseAmount(expense.amount);
    
    // Verificar se é compartilhado/org
    if (expense.split || expense.is_shared) {
      // Para compartilhado, pegar apenas parte do usuário nos splits
      const userSplit = expense.expense_splits?.find(s => s.cost_center_id === userCostCenter?.id);
      if (userSplit) {
        acc[category].org += parseAmount(userSplit.amount);
      }
    } else {
      // Individual
      acc[category].individual += amount;
    }
    
    acc[category].total = acc[category].individual + acc[category].org;
    return acc;
  }, {});

  // Filtrar por viewMode
  const categoryChartData = Object.entries(categoryData)
    .map(([name, data]) => {
      let value;
      if (viewMode === 'individual') {
        value = data.individual;
      } else if (viewMode === 'org') {
        value = data.org;
      } else {
        value = data.total;
      }
      return { name, value, individual: data.individual, org: data.org };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Pizza 2: Divisão por Formas de Pagamento (com breakdown Individual vs Org)
  const paymentMethodData = (expenses || []).reduce((acc, expense) => {
    if (!expense) return acc;
    const method = expense.payment_method || 'other';
    if (!acc[method]) acc[method] = { individual: 0, org: 0, total: 0 };
    
    const amount = parseAmount(expense.amount);
    
    // Verificar se é compartilhado/org
    if (expense.split || expense.is_shared) {
      // Para compartilhado, pegar apenas parte do usuário nos splits
      const userSplit = expense.expense_splits?.find(s => s.cost_center_id === userCostCenter?.id);
      if (userSplit) {
        acc[method].org += parseAmount(userSplit.amount);
      }
    } else {
      // Individual
      acc[method].individual += amount;
    }
    
    acc[method].total = acc[method].individual + acc[method].org;
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

  // Filtrar por viewMode
  const paymentChartData = Object.entries(paymentMethodData)
    .map(([code, data]) => {
      let value;
      if (viewMode === 'individual') {
        value = data.individual;
      } else if (viewMode === 'org') {
        value = data.org;
      } else {
        value = data.total;
      }
      return { key: code, name: methodLabel(code), value, individual: data.individual, org: data.org };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Pizza 3: Divisão por Responsável (com breakdown Individual vs Org)
  // Nova Estratégia:
  // 1) Despesas individuais: somar direto por owner
  // 2) Despesas compartilhadas COM splits: usar os splits personalizados
  // 3) Despesas compartilhadas SEM splits: usar fallback (cost_centers.split_percentage)
  
  const ownerDataByMode = {
    individual: {},
    org: {},
    all: {}
  };

  // Determinar owners individuais conhecidos (ativos e não compartilhados)
  const individualCenters = (costCenters || []).filter(c => c && c.is_active !== false && !c.is_shared);
  
  // Criar mapa de cost_center_id -> name para lookup rápido
  const costCenterMap = {};
  const displayNameByCanon = {};
  individualCenters.forEach(cc => {
    costCenterMap[cc.id] = cc.name;
    displayNameByCanon[canon(cc.name)] = cc.name;
  });

  // Processar cada despesa separando por modo
  (expenses || []).forEach(expense => {
    if (!expense) return;
    const amount = parseAmount(expense.amount);
    
    const isCompartilhado = expense.split || expense.is_shared;
    
    if (isCompartilhado && (expense.owner === (organization?.name || 'Família') || expense.is_shared)) {
      // Despesa compartilhada - processar splits
      if (expense.expense_splits && expense.expense_splits.length > 0) {
        // Usar splits personalizados
        expense.expense_splits.forEach(split => {
          const ccName = costCenterMap[split.cost_center_id] || split.cost_center?.name || 'Outros';
          const ccKey = canon(ccName);
          const splitAmount = parseAmount(split.amount);
          
          // Adicionar à parte org (compartilhada)
          if (!ownerDataByMode.org[ccKey]) ownerDataByMode.org[ccKey] = 0;
          ownerDataByMode.org[ccKey] += splitAmount;
          
          // Adicionar ao total também
          if (!ownerDataByMode.all[ccKey]) ownerDataByMode.all[ccKey] = 0;
          ownerDataByMode.all[ccKey] += splitAmount;
          
          if (!displayNameByCanon[ccKey]) displayNameByCanon[ccKey] = ccName;
        });
      } else {
        // Usar fallback (cost_centers.split_percentage)
        individualCenters.forEach(cc => {
          const percentage = parseFloat(cc.split_percentage || 0);
          const share = (amount * percentage) / 100;
          const ccKey = canon(cc.name);
          
          // Adicionar à parte org
          if (!ownerDataByMode.org[ccKey]) ownerDataByMode.org[ccKey] = 0;
          ownerDataByMode.org[ccKey] += share;
          
          // Adicionar ao total
          if (!ownerDataByMode.all[ccKey]) ownerDataByMode.all[ccKey] = 0;
          ownerDataByMode.all[ccKey] += share;
          
          if (!displayNameByCanon[ccKey]) displayNameByCanon[ccKey] = cc.name;
        });
      }
    } else {
      // Despesa individual
      const ownerRaw = expense.owner || 'Outros';
      const ownerKey = canon(ownerRaw);
      
      // Adicionar à parte individual
      if (!ownerDataByMode.individual[ownerKey]) ownerDataByMode.individual[ownerKey] = 0;
      ownerDataByMode.individual[ownerKey] += amount;
      
      // Adicionar ao total também
      if (!ownerDataByMode.all[ownerKey]) ownerDataByMode.all[ownerKey] = 0;
      ownerDataByMode.all[ownerKey] += amount;
      
      if (!displayNameByCanon[ownerKey]) displayNameByCanon[ownerKey] = ownerRaw;
    }
  });

  // Selecionar dados baseado no viewMode
  const selectedOwnerData = ownerDataByMode[viewMode] || ownerDataByMode.all;
  const ownerData = Object.entries(selectedOwnerData)
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
    const { isMobile, getChartHeight, getDonutRadii, getFontSize } = useResponsiveChart();
    const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const chartData = data.map(d => ({ ...d, total }));

    // Sempre mostrar o maior valor quando não houver hover
    const defaultDisplay = chartData.length > 0 ? chartData[0] : null; // Maior valor já vem ordenado
    const hovered = activeIndex != null ? chartData[activeIndex] : defaultDisplay;
    
    const { innerRadius, outerRadius } = getDonutRadii(56, 120, 40, 90);
    const chartHeight = getChartHeight(280, 240);
    const fontSize = getFontSize('sm', 'xs');

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

    // Handler para interação touch-friendly
    const handleCellClick = (index) => {
      if (isMobile) {
        setActiveIndex(activeIndex === index ? null : index);
      }
    };

    return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 md:mb-6 text-center">{title}</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={0}
              dataKey="value"
              stroke="#fff"
              strokeWidth={1.5}
              cornerRadius={0}
              style={{ strokeLinejoin: 'round' }}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={!isMobile ? (_, index) => setActiveIndex(index) : undefined}
              onMouseLeave={!isMobile ? () => setActiveIndex(null) : undefined}
              onClick={isMobile ? (_, index) => handleCellClick(index) : undefined}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={title === 'Despesas por Responsável'
                    ? resolveColor(entry.name, ownerColorMap)
                    : title === 'Despesas por Formas de Pagamento'
                      ? paymentMethodColor(entry.key || entry.name)
                      : resolveColor(entry.name, categoryColorMap)
                  }
                  style={{ opacity: 1, cursor: isMobile ? 'pointer' : 'default' }}
                />
              ))}
            </Pie>
            {/* Sem tooltip: UX usa centro do donut */}
          </PieChart>
        </ResponsiveContainer>

        {hovered && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
            <div className="text-center">
              <p className={`${isMobile ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-900 max-w-[140px] mx-auto truncate`}>{hovered.name}</p>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-gray-900`}>{`- R$ ${Number(hovered.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
              <p className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-gray-500 font-medium`}>{total > 0 ? `${((hovered.value / total) * 100).toFixed(1)}% do total` : ''}</p>
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
              <p className="text-sm text-gray-600 mt-1">Insights e tendências das suas transações</p>
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
              <p className="text-sm text-gray-600 mt-1">Insights e tendências das suas transações</p>
            </div>
          </div>
          
        </div>
      </div>
      
          {/* Grid dos 3 gráficos pizza */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pizza 1: Por Categorias */}
        <ProfessionalPieChart data={categoryChartData} title="Despesas por Categorias" />
        
        {/* Pizza 2: Por Formas de Pagamento */}
        <ProfessionalPieChart data={paymentChartData} title="Despesas por Formas de Pagamento" />
        
        {/* Pizza 3: Por Responsável */}
        <ProfessionalPieChart data={ownerData} title="Despesas por Responsável" />
      </div>
    </div>
  );
}