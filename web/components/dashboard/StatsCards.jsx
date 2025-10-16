import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { TrendingUp, TrendingDown, CreditCard, Wallet, Users, Target } from 'lucide-react';
import Link from 'next/link';

export default function StatsCards({ 
  cardExpenses = 0, 
  cashExpenses = 0, 
  totalExpenses = 0, 
  costCenters = [], 
  budgets = [],
  monthlyGrowth = 0 
}) {
  const stats = [
    {
      title: "À vista",
      value: `R$ ${cashExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      trend: monthlyGrowth > 0 ? "up" : "down",
      trendValue: `${Math.abs(monthlyGrowth)}%`,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "PIX • Débito • Dinheiro",
      link: "/dashboard/finance"
    },
    {
      title: "Cartões de Crédito",
      value: `R$ ${cardExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: CreditCard,
      trend: monthlyGrowth > 0 ? "up" : "down",
      trendValue: `${Math.abs(monthlyGrowth)}%`,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Faturamento do período",
      link: "/dashboard/cards"
    },
    {
      title: "Total Geral",
      value: `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      trend: "up",
      trendValue: "12%",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Todas as despesas"
    },
    {
      title: "Centros de Custo",
      value: costCenters.length.toString(),
      icon: Users,
      trend: "neutral",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: costCenters.map(c => c.name).join(", ")
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const CardComponent = stat.link ? Link : 'div';
        const cardProps = stat.link ? { href: stat.link } : {};
        
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
                  <span className="text-gray-500">vs mês anterior</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {stat.description}
                </p>
                {stat.link && (
                  <div className="mt-2 text-xs text-blue-600 font-medium">
                    Clique para ver detalhes →
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
