import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { TrendingUp, TrendingDown, CreditCard, Wallet, Users, Target } from 'lucide-react';
import Link from 'next/link';

export default function StatsCards({ 
  cardExpenses = 0, 
  cashExpenses = 0, 
  totalExpenses = 0, 
  costCenters = [], 
  budgets = [],
  monthlyGrowth = 0,
  previousMonthData = {
    cardExpenses: 0,
    cashExpenses: 0,
    totalExpenses: 0
  }
}) {
  // Calcular percentual de crescimento para cada categoria
  const calculateGrowth = (current, previous) => {
    if (!current || current === 0) return 0;
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const cashGrowth = calculateGrowth(cashExpenses, previousMonthData?.cashExpenses || 0);
  const cardGrowth = calculateGrowth(cardExpenses, previousMonthData?.cardExpenses || 0);
  const totalGrowth = calculateGrowth(totalExpenses, previousMonthData?.totalExpenses || 0);

  const stats = [
    {
      title: "Total Geral",
      value: `R$ ${(totalExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      trend: totalGrowth > 0 ? "up" : totalGrowth < 0 ? "down" : "neutral",
      trendValue: `${Math.abs(totalGrowth || 0).toFixed(1)}%`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Todas as despesas"
    },
    {
      title: "À vista",
      value: `R$ ${(cashExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      trend: cashGrowth > 0 ? "up" : cashGrowth < 0 ? "down" : "neutral",
      trendValue: `${Math.abs(cashGrowth || 0).toFixed(1)}%`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "PIX • Débito • Dinheiro"
    },
    {
      title: "Cartões de Crédito",
      value: `R$ ${(cardExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: CreditCard,
      trend: cardGrowth > 0 ? "up" : cardGrowth < 0 ? "down" : "neutral",
      trendValue: `${Math.abs(cardGrowth || 0).toFixed(1)}%`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Faturamento do período"
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => {
        const CardComponent = 'div';
        const cardProps = {};
        
        return (
          <CardComponent key={index} {...cardProps}>
            <Card className={`border-0 shadow-sm hover:shadow-md transition-all duration-200 ${
              stat.link ? 'cursor-pointer hover:scale-105' : ''
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
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
                  <span className="text-gray-500">vs mês anterior</span>
                </div>
                {/* descrição removida para visual mais limpo */}
                {stat.title === 'Total Geral' && (
                  <div className="mt-3">
                    <Link href="/dashboard/expenses">
                      <Button size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" variant="outline">
                        Clique para ver as despesas
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardComponent>
        );
      })}
    </div>
  );
}
