import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LoadingLogo from '../../components/LoadingLogo';
import { 
  LogOut, 
  Settings, 
  Bell, 
  Users, 
  Target,
  Tag,
  UserCheck
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';
import UserManagementModal from '../../components/UserManagementModal';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import CostCenterManagementModal from '../../components/CostCenterManagementModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import NotificationModal from '../../components/NotificationModal';

export default function ConfigPage() {
  const router = useRouter();
  const { organization, user: orgUser, loading: orgLoading, error: orgError } = useOrganization();
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCostCenterModal, setShowCostCenterModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      generateInviteLink();
      setIsDataLoaded(true);
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

  if (orgLoading || !isDataLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Configurações"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Organization Info */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Informações da Organização</h2>
              <div className="flex items-center space-x-6">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-600">Nome</p>
                  <p className="text-lg font-semibold text-gray-900">{organization?.name || 'N/A'}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-600">Código</p>
                  <p className="text-lg font-semibold text-gray-900 font-mono">{organization?.invite_code || 'N/A'}</p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Configuration Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle>
              Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {configSections.flatMap(section => section.actions).map((action, index) => (
                <div key={index}>
                  {action.href ? (
                    <Link href={action.href}>
                      <Button
                        variant="outline"
                        className="w-full h-auto p-4 flex flex-col items-center space-y-2 bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
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
                      variant="outline"
                      className="w-full h-auto p-4 flex flex-col items-center space-y-2 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white"
                      disabled={action.action === 'export'}
                      onClick={() => {
                        if (action.action === 'notifications') {
                          setShowNotificationSettingsModal(true);
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
                      <action.icon className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {action.title}
                          {(action.action === 'export' || action.action === 'notifications') && (
                            <span className="ml-2 text-xs text-gray-500">(Em breve)</span>
                          )}
                        </div>
                        <div className="text-xs opacity-80 mt-1">
                          {action.description}
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>


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
          isOpen={showNotificationSettingsModal}
          onClose={() => setShowNotificationSettingsModal(false)}
          organization={organization}
          user={orgUser}
        />

        <NotificationModal 
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
