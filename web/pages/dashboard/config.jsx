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
  ChevronRight
} from 'lucide-react';
import Header from '../../components/Header';
import MemberManagementModal from '../../components/MemberManagementModal';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import NotificationModal from '../../components/NotificationModal';
import DeleteAccountModal from '../../components/DeleteAccountModal';
import { useNotificationContext } from '../../contexts/NotificationContext';

export default function ConfigPage() {
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
      showError('Erro ao fazer logout');
    }
  };

  const handleDeleteAccount = async () => {
    if (!orgUser || !organization) return;

    setIsDeletingAccount(true);
    try {
      // 1. Se for admin da organização, deletar todos os dados da organização primeiro
      const isAdmin = orgUser.role === 'admin' || organization.admin_id === orgUser.id;
      
      if (isAdmin) {
        // Se for admin, deletar a organização (CASCADE vai deletar tudo relacionado automaticamente)
        const { error: orgError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', organization.id);

        if (orgError) {
          console.error('Erro ao deletar organização:', orgError);
          throw orgError;
        }

        // Deletar o usuário também (não é deletado automaticamente pelo CASCADE da organização)
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', orgUser.id);

        if (userError) {
          console.error('Erro ao deletar usuário:', userError);
          throw userError;
        }

        // Tentar deletar do auth
        try {
          const { error: authError } = await supabase.auth.admin?.deleteUser?.(
            orgUser.id
          );
          if (authError) {
            console.warn('Aviso: Não foi possível deletar do auth:', authError);
          }
        } catch (authErr) {
          console.warn('Aviso: Método admin.deleteUser não disponível:', authErr);
        }

        // Fazer logout e redirecionar
        await supabase.auth.signOut();
        router.push('/');
        return; // Sair da função aqui se for admin
      } else {
        // Se não for admin, deletar apenas os dados do usuário
        
        // 2. Deletar expense_splits relacionados às despesas do usuário
        const { data: userExpenses } = await supabase
          .from('expenses')
          .select('id')
          .eq('user_id', orgUser.id);
        
        if (userExpenses && userExpenses.length > 0) {
          const expenseIds = userExpenses.map(e => e.id);
          await supabase
            .from('expense_splits')
            .delete()
            .in('expense_id', expenseIds);
        }

        // 3. Deletar income_splits relacionados às receitas do usuário
        const { data: userIncomes } = await supabase
          .from('incomes')
          .select('id')
          .eq('user_id', orgUser.id);
        
        if (userIncomes && userIncomes.length > 0) {
          const incomeIds = userIncomes.map(i => i.id);
          await supabase
            .from('income_splits')
            .delete()
            .in('income_id', incomeIds);
        }

        // 4. Deletar bills relacionados ao usuário
        await supabase
          .from('bills')
          .delete()
          .eq('user_id', orgUser.id);

        // 5. Deletar expenses do usuário
        await supabase
          .from('expenses')
          .delete()
          .eq('user_id', orgUser.id);

        // 6. Deletar incomes do usuário
        await supabase
          .from('incomes')
          .delete()
          .eq('user_id', orgUser.id);

        // 7. Deletar cards do usuário
        await supabase
          .from('cards')
          .delete()
          .eq('owner_id', orgUser.id);

        // 8. Deletar bank_account_transactions do usuário primeiro (antes de deletar as contas)
        await supabase
          .from('bank_account_transactions')
          .delete()
          .eq('user_id', orgUser.id);

        // 9. Deletar bank_accounts do usuário (CASCADE vai deletar bank_account_shares automaticamente)
        await supabase
          .from('bank_accounts')
          .delete()
          .eq('user_id', orgUser.id);

        // 10. Deletar budgets do usuário
        await supabase
          .from('budgets')
          .delete()
          .eq('user_id', orgUser.id);

        // 11. Deletar notifications do usuário
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', orgUser.id);

        // 12. Deletar cost_center do usuário (se existir)
        await supabase
          .from('cost_centers')
          .delete()
          .eq('user_id', orgUser.id);

        // 13. Deletar verification_codes do usuário
        await supabase
          .from('verification_codes')
          .delete()
          .eq('user_id', orgUser.id);

        // 14. Deletar user_tours do usuário
        await supabase
          .from('user_tours')
          .delete()
          .eq('user_id', orgUser.id);

        // 15. Deletar investment_contributions do usuário
        await supabase
          .from('investment_contributions')
          .delete()
          .eq('user_id', orgUser.id);

        // 16. Deletar investment_goals do usuário (se for owner)
        await supabase
          .from('investment_goals')
          .delete()
          .eq('user_id', orgUser.id);

        // 17. Deletar onboarding_progress do usuário
        await supabase
          .from('onboarding_progress')
          .delete()
          .eq('user_id', orgUser.id);

        // 18. Deletar pending_invites do usuário (se houver)
        await supabase
          .from('pending_invites')
          .delete()
          .eq('invited_email', orgUser.email);
      }

      // 19. Deletar o usuário
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', orgUser.id);

      if (userError) {
        console.error('Erro ao deletar usuário:', userError);
        throw userError;
      }

      // 20. Tentar deletar a conta de autenticação do Supabase Auth
      // Nota: Isso requer service role key, então pode falhar no client-side
      // Mas não vamos falhar a exclusão se isso não funcionar
      try {
        const { error: authError } = await supabase.auth.admin?.deleteUser?.(
          orgUser.id
        );
        if (authError) {
          console.warn('Aviso: Não foi possível deletar do auth (requer service role):', authError);
        }
      } catch (authErr) {
        console.warn('Aviso: Método admin.deleteUser não disponível no client:', authErr);
        // Não falhar - a exclusão do usuário da tabela users já é suficiente
      }

      // 20. Fazer logout e redirecionar
      await supabase.auth.signOut();
      router.push('/');
      
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      showError('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'));
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
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <Button onClick={() => router.push('/')}>
            Voltar ao início
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
        pageTitle="Configurações"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      >
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-6">
        
        {/* Organization Info - Igual às outras páginas */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informações da Organização</h2>
                <p className="text-sm text-gray-500 mt-1">Gerencie suas configurações</p>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-600">Nome</p>
                <p className="text-lg font-semibold text-gray-900">{organization?.name || 'N/A'}</p>
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

        {/* Legal e Suporte */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Legal e Suporte</CardTitle>
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
                    <p className="font-medium text-gray-900">Política de Privacidade</p>
                    <p className="text-sm text-gray-500">Como tratamos seus dados</p>
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
                    <p className="font-medium text-gray-900">Termos de Uso</p>
                    <p className="text-sm text-gray-500">Condições de utilização</p>
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
                    <p className="font-medium text-gray-900">Suporte</p>
                    <p className="text-sm text-gray-500">Entre em contato conosco</p>
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
            <CardTitle className="text-lg font-semibold text-gray-900">Conta e Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Encerrar Sessão */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Encerrar Sessão</p>
                  <p className="text-sm text-gray-500">Fazer logout da sua conta</p>
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

              {/* Excluir Conta */}
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900">Excluir Conta</p>
                <p className="text-sm text-gray-500">Remover permanentemente sua conta e todos os dados</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDeleteAccountModal(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
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
