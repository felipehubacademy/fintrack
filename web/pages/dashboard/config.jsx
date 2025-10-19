import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  LogOut, 
  Settings, 
  Bell, 
  Users, 
  Target,
  Copy,
  CheckCircle,
  UserPlus,
  Tag,
  UserCheck
} from 'lucide-react';
import Header from '../../components/Header';
import Link from 'next/link';
import UserManagementModal from '../../components/UserManagementModal';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import CostCenterManagementModal from '../../components/CostCenterManagementModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';

export default function ConfigPage() {
  const router = useRouter();
  const { organization, user: orgUser, loading: orgLoading, error: orgError } = useOrganization();
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCostCenterModal, setShowCostCenterModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      generateInviteLink();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const generateInviteLink = () => {
    if (organization?.invite_code) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteLink(`${baseUrl}/invite/${organization.invite_code}`);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const configSections = [
    {
      title: "Usuários e Convites",
      description: "Gerenciar membros da organização",
      icon: Users,
      color: "bg-green-50",
      iconColor: "text-green-600",
      actions: [
        {
          title: "Gerenciar Usuários",
          description: "Listar e gerenciar membros",
          action: "users",
          icon: UserCheck
        },
        {
          title: "Compartilhar Link",
          description: "Link de convite da organização",
          action: "share",
          icon: UserPlus
        }
      ]
    },
    {
      title: "Categorias e Responsáveis",
      description: "Gerenciar categorias e responsáveis",
      icon: Settings,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
      actions: [
        {
          title: "Responsáveis",
          description: "Gerenciar responsáveis",
          action: "cost-centers",
          icon: UserCheck
        },
        {
          title: "Categorias",
          description: "Personalizar categorias",
          action: "categories",
          icon: Tag
        }
      ]
    },
    {
      title: "Notificações",
      description: "Configurar alertas e notificações",
      icon: Bell,
      color: "bg-orange-50",
      iconColor: "text-orange-600",
      actions: [
        {
          title: "Configurar Notificações",
          description: "Alertas e lembretes",
          action: "notifications",
          icon: Bell
        }
      ]
    }
  ];

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <Button onClick={() => router.push('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Configurações"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Organization Info */}
        <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <span>Informações da Organização</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome da Organização</label>
                <p className="text-lg font-semibold text-gray-900">{organization?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Código de Convite</label>
                <p className="text-lg font-semibold text-gray-900 font-mono">{organization?.invite_code || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configSections.map((section, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <section.icon className={`h-4 w-4 ${section.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {section.actions.map((action, actionIndex) => (
                    <div key={actionIndex}>
                      {action.href ? (
                        <Link href={action.href}>
                          <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 hover:bg-gray-50">
                            <action.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                            <div className="text-left flex-1">
                              <div className="font-medium text-gray-900">{action.title}</div>
                              <div className="text-xs text-gray-600 mt-1">{action.description}</div>
                            </div>
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          variant={action.action === 'share' && copied ? "default" : "outline"}
                          className={`w-full justify-start h-auto py-3 px-4 hover:bg-gray-50 ${
                            action.action === 'share' && copied ? "bg-green-600 hover:bg-green-700 text-white" : ""
                          }`}
                          disabled={action.action === 'export'}
                          onClick={() => {
                            if (action.action === 'share') {
                              copyInviteLink();
                            } else if (action.action === 'notifications') {
                              setShowNotificationModal(true);
                            } else if (action.action === 'users') {
                              setShowUserModal(true);
                            } else if (action.action === 'categories') {
                              setShowCategoryModal(true);
                            } else if (action.action === 'cost-centers') {
                              setShowCostCenterModal(true);
                            } else if (action.action === 'export') {
                              // TODO: Implementar exportação
                            }
                          }}
                        >
                          {action.action === 'share' && copied ? (
                            <CheckCircle className="h-4 w-4 mr-3 flex-shrink-0" />
                          ) : (
                            <action.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          )}
                          <div className="text-left flex-1">
                            <div className={`font-medium ${action.action === 'share' && copied ? "text-white" : "text-gray-900"}`}>
                              {action.action === 'share' && copied ? "Link Copiado!" : action.title}
                              {(action.action === 'export' || action.action === 'notifications') && (
                                <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${action.action === 'share' && copied ? "text-green-100" : "text-gray-600"}`}>
                              {action.action === 'share' && copied ? "Link copiado para a área de transferência" : action.description}
                            </div>
                          </div>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>


        {/* Modals */}
        <UserManagementModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          organization={organization}
        />

        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          organization={organization}
        />

        <CostCenterManagementModal
          isOpen={showCostCenterModal}
          onClose={() => setShowCostCenterModal(false)}
          organization={organization}
        />

        <NotificationSettingsModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          organization={organization}
          user={orgUser}
        />
      </main>
    </div>
  );
}
