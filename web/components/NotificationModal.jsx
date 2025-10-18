import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock,
  Settings
} from 'lucide-react';

export default function NotificationModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    email: true,
    push: true,
    sms: false,
    budgetAlerts: true,
    paymentReminders: true,
    monthlyReports: true
  });

  useEffect(() => {
    if (isOpen) {
      // Simular notificações (em produção viria da API)
      setNotifications([
        {
          id: 1,
          type: 'budget',
          title: 'Orçamento Atingido',
          message: 'Você atingiu 80% do orçamento de alimentação este mês.',
          time: '2 horas atrás',
          read: false,
          priority: 'high'
        },
        {
          id: 2,
          type: 'payment',
          title: 'Lembrete de Pagamento',
          message: 'Fatura do cartão vence em 3 dias.',
          time: '1 dia atrás',
          read: false,
          priority: 'medium'
        },
        {
          id: 3,
          type: 'info',
          title: 'Relatório Mensal',
          message: 'Seu relatório de outubro está disponível.',
          time: '3 dias atrás',
          read: true,
          priority: 'low'
        }
      ]);
    }
  }, [isOpen]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'budget':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'payment':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <span>Notificações</span>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar todas como lidas
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </Badge>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Configurações</h3>
            <Settings className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={settings.budgetAlerts}
                onChange={(e) => setSettings(prev => ({ ...prev, budgetAlerts: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Alertas de orçamento</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={settings.paymentReminders}
                onChange={(e) => setSettings(prev => ({ ...prev, paymentReminders: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Lembretes de pagamento</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={settings.monthlyReports}
                onChange={(e) => setSettings(prev => ({ ...prev, monthlyReports: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Relatórios mensais</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
