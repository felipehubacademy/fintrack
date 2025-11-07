import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Filter, Search } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

export default function NotificationCenterModal({ isOpen, onClose, userId, organizationId }) {
  const [filter, setFilter] = useState('all'); // all, unread, type
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(userId, organizationId);

  const itemsPerPage = 20;

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    // Filtro de status
    if (filter === 'unread' && notification.read_at) return false;
    
    // Filtro de tipo
    if (selectedType && notification.type !== selectedType) return false;
    
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Agrupar por data usando fuso horário do Brasil
  const groupedNotifications = {};
  const today = getBrazilToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  paginatedNotifications.forEach(notification => {
    // Converter created_at para data no fuso do Brasil
    const notificationDate = new Date(notification.created_at);
    // Criar data normalizada (sem hora) no fuso local
    const notificationDateNormalized = new Date(
      notificationDate.getFullYear(),
      notificationDate.getMonth(),
      notificationDate.getDate()
    );
    
    let groupKey;
    if (notificationDateNormalized.getTime() === today.getTime()) {
      groupKey = 'Hoje';
    } else if (notificationDateNormalized.getTime() === yesterday.getTime()) {
      groupKey = 'Ontem';
    } else if (notificationDateNormalized >= weekAgo) {
      groupKey = 'Esta Semana';
    } else {
      groupKey = notificationDate.toLocaleDateString('pt-BR', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
    
    if (!groupedNotifications[groupKey]) {
      groupedNotifications[groupKey] = [];
    }
    groupedNotifications[groupKey].push(notification);
  });

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedType, searchTerm]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bill_reminder': return '🔔';
      case 'investment_reminder': return '🎯';
      case 'budget_alert': return '⚠️';
      case 'daily_reminder': return '📊';
      case 'weekly_report': return '📈';
      case 'monthly_report': return '📊';
      case 'insight': return '💡';
      case 'expense_confirmation': return '✅';
      case 'system_alert': return '🚨';
      default: return '📢';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      'bill_reminder': 'Contas a Pagar',
      'investment_reminder': 'Investimentos',
      'budget_alert': 'Alerta de Orçamento',
      'daily_reminder': 'Lembrete Diário',
      'weekly_report': 'Relatório Semanal',
      'monthly_report': 'Relatório Mensal',
      'insight': 'Insight',
      'expense_confirmation': 'Confirmação',
      'system_alert': 'Alerta do Sistema'
    };
    return labels[type] || type;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (notificationId) => {
    await deleteNotification(notificationId);
  };

  const handleRefresh = () => {
    fetchNotifications(currentPage, itemsPerPage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Centro de Notificações
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount} não lidas • {notifications.length} total
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={handleRefresh}
                disabled={loading}
              >
                Atualizar
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleMarkAllAsRead}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar notificações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro de status */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todas</option>
              <option value="unread">Não lidas</option>
            </select>

            {/* Filtro de tipo */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Todos os tipos</option>
              <option value="bill_reminder">Contas a Pagar</option>
              <option value="investment_reminder">Investimentos</option>
              <option value="budget_alert">Alerta de Orçamento</option>
              <option value="daily_reminder">Lembrete Diário</option>
              <option value="weekly_report">Relatório Semanal</option>
              <option value="monthly_report">Relatório Mensal</option>
              <option value="insight">Insight</option>
              <option value="expense_confirmation">Confirmação</option>
              <option value="system_alert">Alerta do Sistema</option>
            </select>
          </div>
        </div>

        {/* Lista de notificações */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Carregando notificações...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchTerm || selectedType || filter !== 'all' 
                ? 'Nenhuma notificação encontrada com os filtros aplicados'
                : 'Nenhuma notificação encontrada'
              }
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotifications).map(([groupKey, groupNotifications]) => (
                <div key={groupKey}>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    {groupKey}
                  </h3>
                  <div className="space-y-3">
                    {groupNotifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={`p-4 transition-all hover:shadow-md ${
                          !notification.read_at ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">
                            {getTypeIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </h4>
                                  <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(notification.priority)}`}>
                                    {notification.priority}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {getTypeLabel(notification.type)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>{formatTime(notification.created_at)}</span>
                                  {notification.sent_via && (
                                    <span>Via: {notification.sent_via}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 ml-4">
                                {!notification.read_at && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="text-gray-400 hover:text-green-600 transition-colors p-1"
                                    title="Marcar como lida"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(notification.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                  title="Deletar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
