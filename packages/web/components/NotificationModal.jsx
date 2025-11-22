import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock
} from 'lucide-react';

export default function NotificationModal({ isOpen, onClose, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Simular notificações (em produção viria da API)
      const mockNotifications = [
        {
          id: 1,
          type: 'budget',
          title: 'Orçamento Atingido',
          message: 'Você atingiu 80% do orçamento de alimentação este mês.',
          time: '2 horas atrás',
          read: false,
          priority: 'alta'
        },
        {
          id: 2,
          type: 'payment',
          title: 'Lembrete de Pagamento',
          message: 'Fatura do cartão vence em 3 dias.',
          time: '1 dia atrás',
          read: false,
          priority: 'média'
        },
        {
          id: 3,
          type: 'info',
          title: 'Relatório Mensal',
          message: 'Seu relatório de outubro está disponível.',
          time: '3 dias atrás',
          read: true,
          priority: 'baixa'
        }
      ];
      setNotifications(mockNotifications);
      
      // Atualizar contador no header
      const unreadCount = mockNotifications.filter(n => !n.read).length;
      onUnreadCountChange && onUnreadCountChange(unreadCount);
    }
  }, [isOpen, onUnreadCountChange]);

  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      );
      // Atualizar contador no header
      const unreadCount = updated.filter(n => !n.read).length;
      onUnreadCountChange && onUnreadCountChange(unreadCount);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notif => ({ ...notif, read: true }));
      // Atualizar contador no header
      onUnreadCountChange && onUnreadCountChange(0);
      return updated;
    });
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



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl max-h-[90vh] overflow-hidden border border-flight-blue/20">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-flight-blue/5 rounded-t-xl">
            <CardTitle className="flex items-center space-x-3">
              <span className="text-gray-900 font-semibold">Notificações</span>
            </CardTitle>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={notifications.filter(n => !n.read).length === 0}
                className="text-gray-700 hover:bg-gray-100 text-xs sm:text-sm"
              >
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Marcar todas como lidas</span>
                <span className="sm:hidden">Todas</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="text-gray-700 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh] lg:max-h-[75vh] xl:max-h-[80vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-fog-mist" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                <div className="space-y-1 pt-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 border-b border-fog-mist hover:bg-flight-blue/5 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-flight-blue/5' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start sm:items-center justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-900 leading-tight">
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-flight-blue rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
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

      </div>
    </div>
  );
}
