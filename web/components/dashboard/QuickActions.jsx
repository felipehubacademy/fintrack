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
  Receipt,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';

export default function QuickActions() {
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
      title: "Orçamentos",
      description: "Definir metas mensais",
      icon: Target,
      href: "/dashboard/budgets",
      color: "bg-orange-500 hover:bg-orange-600",
      textColor: "text-white"
    }
  ];

  const visibleActions = actions;

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
