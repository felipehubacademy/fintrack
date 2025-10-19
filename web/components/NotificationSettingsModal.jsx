import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Bell, X, Save, Mail, MessageSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function NotificationSettingsModal({ isOpen, onClose, organization, user }) {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    whatsappNotifications: true,
    budgetWarnings: true,
    expenseAlerts: true,
    weeklyReports: false,
    monthlyReports: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchSettings();
    }
  }, [isOpen, user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();

      if (data && data.settings) {
        setSettings({ ...settings, ...data.settings });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          organization_id: organization.id,
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      alert('Configurações salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const notificationTypes = [
    {
      key: 'emailNotifications',
      title: 'Notificações por Email',
      description: 'Receber alertas e relatórios por email',
      icon: Mail,
      color: 'bg-blue-500'
    },
    {
      key: 'whatsappNotifications',
      title: 'Notificações WhatsApp',
      description: 'Receber confirmações via WhatsApp',
      icon: MessageSquare,
      color: 'bg-green-500'
    },
    {
      key: 'budgetWarnings',
      title: 'Alertas de Orçamento',
      description: 'Avisos quando próximo do limite',
      icon: AlertTriangle,
      color: 'bg-yellow-500'
    },
    {
      key: 'expenseAlerts',
      title: 'Alertas de Despesas',
      description: 'Confirmações de despesas registradas',
      icon: Bell,
      color: 'bg-purple-500'
    },
    {
      key: 'weeklyReports',
      title: 'Relatórios Semanais',
      description: 'Resumo semanal de gastos',
      icon: Mail,
      color: 'bg-indigo-500'
    },
    {
      key: 'monthlyReports',
      title: 'Relatórios Mensais',
      description: 'Resumo mensal completo',
      icon: Mail,
      color: 'bg-pink-500'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <span>Configurações de Notificações</span>
              </CardTitle>
              <Button variant="Koost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando configurações...</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 mb-6">
                  Configure como deseja receber notificações e alertas sobre suas finanças.
                </div>

                <div className="space-y-4">
                  {notificationTypes.map((type) => (
                    <div key={type.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${type.color}`}>
                          <type.icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{type.title}</h4>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleSetting(type.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          settings[type.key] ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[type.key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
