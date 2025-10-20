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
  FolderOpen,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import ExpenseModal from '../ExpenseModal';

export default function QuickActions() {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const actions = [
    {
      title: "Ver Despesas",
      description: "Visualizar todas as despesas",
      icon: TrendingUp,
      href: "/dashboard/expenses",
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    },
    {
      title: "Adicionar Despesa",
      description: "Registrar nova despesa",
      icon: Plus,
      href: null,
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    },
    {
      title: "Gerenciar Cartões",
      description: "Adicionar ou configurar cartões",
      icon: CreditCard,
      href: "/dashboard/cards",
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    },
    {
      title: "Orçamentos",
      description: "Definir metas mensais",
      icon: Target,
      href: "/dashboard/budgets",
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    }
  ];

  const visibleActions = actions;

  return (
    <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
      <CardHeader>
        <CardTitle>
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {visibleActions.map((action, index) => (
            action.href ? (
              <Link key={index} href={action.href}>
                <Button
                  variant="outline"
                  className={`w-full h-auto p-4 flex flex-col items-center space-y-2 ${action.color} ${action.textColor} hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md`}
                >
                  <action.icon className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs opacity-80 mt-1">{action.description}</div>
                  </div>
                </Button>
              </Link>
            ) : (
              <Button
                key={index}
                variant="outline"
                onClick={() => setShowExpenseModal(true)}
                className={`w-full h-auto p-4 flex flex-col items-center space-y-2 ${action.color} ${action.textColor} hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md`}
              >
                <action.icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-80 mt-1">{action.description}</div>
                </div>
              </Button>
            )
          ))}
        </div>
      </CardContent>
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={() => setShowExpenseModal(false)}
      />
    </Card>
  );
}
