import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LoadingLogo from '../../components/LoadingLogo';
import { 
  Settings, 
  Bell, 
  Users, 
  Tag,
  UserCheck,
  Trash2,
  LogOut,
  FileText,
  MessageCircle,
  ChevronRight,
  Link2
} from 'lucide-react';
import Header from '../../components/Header';
import MemberManagementModal from '../../components/MemberManagementModal';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import NotificationModal from '../../components/NotificationModal';
import DeleteAccountModal from '../../components/DeleteAccountModal';

import { useNotificationContext } from '../../contexts/NotificationContext';
import { useI18n } from '../../contexts/I18nContext';

export default function ConfigPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { organization, user: orgUser, isSoloUser, loading: orgLoading, error: orgError } = useOrganization();
  const { success, error: showError } = useNotificationContext();
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showNotificationSettingsModal, setShowNotificationSettingsModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      setIsDataLoaded(true);
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      showError(t('web.config.couldnTSignOut'));
    }
  };

  const handleDeleteAccount = async () => {
    if (!orgUser || !organization) return;

    setIsDeletingAccount(true);
    try {
      // The server derives who is deleting from the session token and removes
      // the caller's data, their auth user, and the organization when they are
      // its only member (admin rights pass on otherwise).
      const response = await fetch('/api/account/delete', { method: 'POST' });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || t('web.config.couldnTDeleteTheAccount'));
      }

      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      showError(t('web.config.couldnTDelete') + (error.message || t('web.shared.unknownError')));
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
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
          <p className="text-gray-600 mb-4">{t('web.shared.youNeedAnInviteTo')}</p>
          <Button onClick={() => router.push('/')}>
            {t('web.shared.backToHome2')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle={t('web.config.settings')}
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      >
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-6">
        
        {/* Organization Info - Igual às outras páginas */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('web.config.household')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('web.config.yourSettings')}</p>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-600">{t('web.config.name')}</p>
                <p className="text-lg font-semibold text-gray-900">{organization?.name || 'N/A'}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Configurações - Layout simples e limpo */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">{t('web.config.settings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Usuários e Membros */}
              {!isSoloUser && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{t('web.config.members')}</p>
                      <p className="text-sm text-gray-500">{t('web.config.addRemoveAndManagePeople')}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowMemberModal(true)}
                    className="bg-flight-blue hover:bg-flight-blue/90 text-white min-w-[120px]"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {t('web.config.manage')}
                  </Button>
                </div>
              )}

              {/* Notificações */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <Bell className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{t('web.shared.notifications')}</p>
                    <p className="text-sm text-gray-500">{t('web.config.alertsRemindersAndReports')}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowNotificationSettingsModal(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 text-white min-w-[120px]"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {t('web.config.manage')}
                </Button>
              </div>

              {/* Categorias */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{t('web.config.categories')}</p>
                    <p className="text-sm text-gray-500">{t('web.config.customizeExpenseAndIncomeCategories')}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCategoryModal(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 text-white min-w-[120px]"
                >
                  <Tag className="h-4 w-4 mr-2" />
                  {t('web.config.manage')}
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Legal e Suporte */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">{t('web.config.legalAndSupport')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-3 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{t('web.shared.privacyPolicy')}</p>
                    <p className="text-sm text-gray-500">{t('web.config.howWeHandleYourData')}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </a>

              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg px-3 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{t('web.config.termsOfUse')}</p>
                    <p className="text-sm text-gray-500">{t('web.config.termsOfUse2')}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </a>

              <a
                href="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-3 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{t('web.shared.support')}</p>
                    <p className="text-sm text-gray-500">{t('web.config.getInTouch')}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Conta e Sessão */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">{t('web.config.accountAndSession')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Encerrar Sessão */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{t('web.config.signOut')}</p>
                  <p className="text-sm text-gray-500">{t('web.config.signOutOfYourAccount')}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('web.config.signOut2')}
                </Button>
              </div>

              {/* Excluir Conta */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">{t('web.config.deleteAccount')}</p>
                <p className="text-sm text-gray-500">{t('web.config.permanentlyDeleteYourAccountAnd')}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteAccountModal(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('web.shared.delete')}
              </Button>
              </div>
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

        <DeleteAccountModal
          isOpen={showDeleteAccountModal}
          onClose={() => setShowDeleteAccountModal(false)}
          onConfirm={handleDeleteAccount}
          loading={isDeletingAccount}
        />

      </main>
      </Header>
    </>
  );
}
