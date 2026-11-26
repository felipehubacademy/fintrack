import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Plus, 
  CreditCard, 
  Target, 
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import TransactionModal from '../TransactionModal';
import { useI18n } from '../../contexts/I18nContext';

export default function QuickActions() {
  const { t } = useI18n();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const actions = [
    {
      title: t('web.quickActions.addTransaction'),
      description: t('web.quickActions.expenseOrIncome'),
      icon: Plus,
      href: null,
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    },
    {
      title: t('web.quickActions.seeTransactions'),
      description: t('web.quickActions.seeAllYourTransactions'),
      icon: TrendingUp,
      href: "/dashboard/transactions",
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    },
    {
      title: t('web.quickActions.manageCards'),
      description: t('web.quickActions.addOrSetUpCards'),
      icon: CreditCard,
      href: "/dashboard/cards",
      color: "bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue",
      textColor: "text-white"
    },
    {
      title: t('web.quickActions.budgets'),
      description: t('web.quickActions.setMonthlyLimits'),
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
          {t('web.quickActions.quickActions')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {visibleActions.map((action, index) => (
            action.href ? (
              <Link key={index} href={action.href}>
                <Button
                  variant="outline"
                  className={`w-full h-auto p-3 md:p-4 flex flex-col items-center space-y-2 ${action.color} ${action.textColor} hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md min-h-[100px] md:min-h-0`}
                >
                  <action.icon className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium text-xs md:text-sm">{action.title}</div>
                    <div className="text-[10px] md:text-xs opacity-80 mt-1">{action.description}</div>
                  </div>
                </Button>
              </Link>
            ) : (
              <Button
                key={index}
                variant="outline"
                onClick={() => setShowTransactionModal(true)}
                className={`w-full h-auto p-3 md:p-4 flex flex-col items-center space-y-2 ${action.color} ${action.textColor} hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md min-h-[100px] md:min-h-0`}
              >
                <action.icon className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium text-xs md:text-sm">{action.title}</div>
                  <div className="text-[10px] md:text-xs opacity-80 mt-1">{action.description}</div>
                </div>
              </Button>
            )
          ))}
        </div>
      </CardContent>
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={() => setShowTransactionModal(false)}
      />
    </Card>
  );
}
