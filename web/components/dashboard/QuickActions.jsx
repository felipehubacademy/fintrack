import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Plus, 
  CreditCard, 
  Users, 
  Target, 
  Settings, 
  Share2,
  BarChart3,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function QuickActions({ userRole = 'member' }) {
  const actions = [
    {
      title: "Adicionar Despesa",
      description: "Registrar nova despesa",
      icon: Plus,
      href: "/dashboard/expenses/new",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-white"
    },
    {
      title: "Gerenciar Cartões",
      description: "Adicionar ou configurar cartões",
      icon: CreditCard,
      href: "/dashboard/cards",
      color: "bg-purple-500 hover:bg-purple-600",
      textColor: "text-white"
    },
    {
      title: "Convidar Usuários",
      description: "Adicionar membros à organização",
      icon: Users,
      href: "/dashboard/users/invite",
      color: "bg-green-500 hover:bg-green-600",
      textColor: "text-white",
      adminOnly: true
    },
    {
      title: "Orçamentos",
      description: "Definir metas mensais",
      icon: Target,
      href: "/dashboard/budgets",
      color: "bg-orange-500 hover:bg-orange-600",
      textColor: "text-white"
    },
    {
      title: "Centros de Custo",
      description: "Gerenciar categorias",
      icon: Settings,
      href: "/dashboard/cost-centers",
      color: "bg-gray-500 hover:bg-gray-600",
      textColor: "text-white",
      adminOnly: true
    },
    {
      title: "Relatórios",
      description: "Análises detalhadas",
      icon: BarChart3,
      href: "/dashboard/reports",
      color: "bg-indigo-500 hover:bg-indigo-600",
      textColor: "text-white"
    },
    {
      title: "Compartilhar",
      description: "Link de convite",
      icon: Share2,
      href: "/dashboard/share",
      color: "bg-pink-500 hover:bg-pink-600",
      textColor: "text-white",
      adminOnly: true
    },
    {
      title: "Extratos",
      description: "Histórico completo",
      icon: Receipt,
      href: "/dashboard/statements",
      color: "bg-teal-500 hover:bg-teal-600",
      textColor: "text-white"
    }
  ];

  const visibleActions = userRole === 'admin' 
    ? actions 
    : actions.filter(action => !action.adminOnly);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <span>Ações Rápidas</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {visibleActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Button
                variant="outline"
                className={`w-full h-auto p-4 flex flex-col items-center space-y-2 ${action.color} ${action.textColor} border-0 hover:scale-105 transition-transform`}
              >
                <action.icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-80 mt-1">{action.description}</div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
