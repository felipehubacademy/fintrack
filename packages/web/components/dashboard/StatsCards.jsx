import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '../../contexts/I18nContext';
import { formatMoney } from '@fintrack/shared/i18n';

export default function StatsCards({ 
  totalExpenses = 0,
  totalIncomes = 0,
  previousMonthData = {
    totalExpenses: 0,
    totalIncomes: 0
  }
}) {
  const { t } = useI18n();
  // Calcular percentual de crescimento para cada categoria
  const calculateGrowth = (current, previous) => {
    if (!current || current === 0) return 0;
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const expensesGrowth = calculateGrowth(totalExpenses, previousMonthData?.totalExpenses || 0);
  const incomesGrowth = calculateGrowth(totalIncomes, previousMonthData?.totalIncomes || 0);
  const balance = totalIncomes - totalExpenses;
  const balanceGrowth = previousMonthData?.totalIncomes && previousMonthData?.totalExpenses
    ? calculateGrowth(balance, (previousMonthData.totalIncomes - previousMonthData.totalExpenses))
    : 0;

  const stats = [
    {
      title: t('web.shared.totalIncome'),
      value: `${formatMoney((totalIncomes || 0))}`,
      icon: ArrowDownCircle,
      trend: incomesGrowth > 0 ? "up" : incomesGrowth < 0 ? "down" : "neutral",
      trendValue: `${Math.abs(incomesGrowth || 0).toFixed(1)}%`,
      color: "text-flight-blue",
      bgColor: "bg-flight-blue/5",
      borderColor: "border-flight-blue/20"
    },
    {
      title: t('web.shared.totalExpenses'),
      value: `- ${formatMoney((totalExpenses || 0))}`,
      icon: ArrowUpCircle,
      trend: expensesGrowth > 0 ? "up" : expensesGrowth < 0 ? "down" : "neutral",
      trendValue: `${Math.abs(expensesGrowth || 0).toFixed(1)}%`,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    },
    {
      title: t('web.statsCards.monthBalance'),
      value: `${balance >= 0 ? '' : '-'} ${formatMoney(Math.abs(balance))}`,
      icon: DollarSign,
      trend: balanceGrowth > 0 ? "up" : balanceGrowth < 0 ? "down" : "neutral",
      trendValue: `${Math.abs(balanceGrowth || 0).toFixed(1)}%`,
      color: balance >= 0 ? "text-green-600" : "text-red-600",
      bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
      borderColor: balance >= 0 ? "border-green-200" : "border-red-200"
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-3 w-full">
      {stats.map((stat, index) => {
        const CardComponent = 'div';
        const cardProps = {};
        
        return (
          <CardComponent key={index} {...cardProps}>
            <Card className={`${stat.borderColor ? `border ${stat.borderColor}` : ''} shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${
              stat.link ? 'cursor-pointer hover:scale-105' : ''
            } ${stat.bgColor}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  {stat.trend === "up" && (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{stat.trendValue}</span>
                    </>
                  )}
                  {stat.trend === "down" && (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">-{stat.trendValue}</span>
                    </>
                  )}
                  {stat.trend === "neutral" && (
                    <>
                      <span className="text-gray-500">0%</span>
                    </>
                  )}
                  <span className="text-gray-500">{t('web.shared.vsLastMonth')}</span>
                </div>
                {/* descrição removida para visual mais limpo */}
              </CardContent>
            </Card>
          </CardComponent>
        );
      })}
    </div>
  );
}
