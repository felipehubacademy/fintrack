export default function FinancialScoreGauge({ score = 0, breakdown = {} }) {
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#3B82F6'; // Blue
    if (score >= 40) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getRating = () => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Precisa melhorar';
  };

  const breakdownItems = [
    { key: 'budgetAdherence', label: 'Cumprimento de orçamento', max: 30 },
    { key: 'investmentConsistency', label: 'Consistência de investimentos', max: 25 },
    { key: 'emergencyFund', label: 'Reserva de emergência', max: 20 },
    { key: 'incomeDiversity', label: 'Diversidade de receitas', max: 15 },
    { key: 'debtReduction', label: 'Redução de dívidas', max: 10 }
  ];

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Gauge */}
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            stroke={getColor()}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ 
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease'
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold" style={{ color: getColor() }}>
            {score}
          </div>
          <div className="text-sm text-gray-600">de 100</div>
        </div>
      </div>

      {/* Rating */}
      <div className="text-center">
        <div className="text-xl font-semibold text-gray-900">{getRating()}</div>
        <div className="text-sm text-gray-600">Saúde Financeira</div>
      </div>

      {/* Breakdown */}
      <div className="w-full space-y-2">
        {breakdownItems.map((item) => {
          const value = breakdown[item.key] || 0;
          const percentage = (value / item.max) * 100;

          return (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{item.label}</span>
                <span className="font-medium">{value}/{item.max}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: getColor()
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

