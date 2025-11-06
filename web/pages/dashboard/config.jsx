import { useEffect, useState, useMemo } from 'react';
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
  Tag,
  UserCheck,
  Copy,
  CheckCircle2
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MemberManagementModal from '../../components/MemberManagementModal';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import NotificationModal from '../../components/NotificationModal';
import { useNotificationContext } from '../../contexts/NotificationContext';

export default function ConfigPage() {
  const router = useRouter();
  const { organization, user: orgUser, isSoloUser, loading: orgLoading, error: orgError } = useOrganization();
  const { success } = useNotificationContext();
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      setIsDataLoaded(true);
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCopyCode = () => {
    if (organization?.invite_code) {
      navigator.clipboard.writeText(organization.invite_code);
      setCopied(true);
      success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-6">
        
        {/* Organization Info - Igual às outras páginas */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informações da Organização</h2>
                <p className="text-sm text-gray-500 mt-1">Gerencie suas configurações</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-600">Nome</p>
                  <p className="text-lg font-semibold text-gray-900">{organization?.name || 'N/A'}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-600">Código de Convite</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold text-gray-900 font-mono">{organization?.invite_code || 'N/A'}</p>
                    {organization?.invite_code && (
                      <button
                        onClick={handleCopyCode}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Copiar código"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-4 w-4 text-flight-blue" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Configurações - Layout simples e limpo */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Usuários e Membros */}
              {!isSoloUser && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Gerenciar Membros</p>
                      <p className="text-sm text-gray-500">Adicionar, remover e gerenciar membros da organização</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowMemberModal(true)}
                    className="bg-flight-blue hover:bg-flight-blue/90 text-white min-w-[120px]"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Gerenciar
                  </Button>
                </div>
              )}

              {/* Notificações */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Notificações</p>
                    <p className="text-sm text-gray-500">Configurar alertas, lembretes e relatórios</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowNotificationSettingsModal(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 text-white min-w-[120px]"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
              </div>

              {/* Categorias */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Categorias</p>
                    <p className="text-sm text-gray-500">Personalizar categorias de despesas e receitas</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 text-white min-w-[120px]"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conta e Segurança */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Sair da Conta</p>
                <p className="text-sm text-gray-500">Encerrar sua sessão atual</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        <MemberManagementModal
          isOpen={showMemberModal}
          onClose={() => setShowMemberModal(false)}
          organization={organization}
          orgUser={orgUser}
        />

        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
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
