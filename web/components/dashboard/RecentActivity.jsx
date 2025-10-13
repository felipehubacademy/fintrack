import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Clock, CreditCard, Wallet, User } from 'lucide-react';

export default function RecentActivity({ expenses = [] }) {
  const recentExpenses = expenses.slice(0, 5);

  const getPaymentIcon = (paymentMethod) => {
    switch (paymentMethod) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />;
      case 'pix':
      case 'cash':
      case 'debit':
        return <Wallet className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getPaymentColor = (paymentMethod) => {
    switch (paymentMethod) {
      case 'credit_card':
        return 'bg-blue-100 text-blue-800';
      case 'pix':
        return 'bg-green-100 text-green-800';
      case 'cash':
        return 'bg-yellow-100 text-yellow-800';
      case 'debit':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPaymentMethod = (paymentMethod) => {
    switch (paymentMethod) {
      case 'credit_card':
        return 'Cartão';
      case 'pix':
        return 'PIX';
      case 'cash':
        return 'Dinheiro';
      case 'debit':
        return 'Débito';
      default:
        return 'Outros';
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <span>Atividade Recente</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentExpenses.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentExpenses.map((expense, index) => (
              <div key={expense.id || index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getPaymentIcon(expense.payment_method)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {expense.description}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      R$ {parseFloat(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className={`text-xs ${getPaymentColor(expense.payment_method)}`}>
                      {formatPaymentMethod(expense.payment_method)}
                    </Badge>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{expense.owner}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
