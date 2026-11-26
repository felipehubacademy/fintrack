import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import BankAccountModal from '../../components/BankAccountModal';
import BankTransactionModal from '../../components/BankTransactionModal';
import BankTransactionsModal from '../../components/BankTransactionsModal';
import BankIncomeModal from '../../components/BankIncomeModal';

import ConfirmationModal from '../../components/ConfirmationModal';
import AccountTypeSelectionModal from '../../components/AccountTypeSelectionModal';
import Header from '../../components/Header';
import LoadingLogo from '../../components/LoadingLogo';
import Tooltip from '../../components/ui/Tooltip';
import { Plus, Building2, Wallet, TrendingUp, TrendingDown, DollarSign, Edit, Trash2, ArrowRightLeft, List, Link2, ExternalLink } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';
import { useI18n } from '../../contexts/I18nContext';

export default function BankAccounts() {
  const { t } = useI18n();
  const router = useRouter();
  const { organization, user, costCenters, incomeCategories, loading: orgLoading } = useOrganization();
  const { showError } = useNotificationContext();
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    positiveBalance: 0,
    negativeBalance: 0,
    totalAccounts: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAccountTypeModalOpen, setIsAccountTypeModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBelvoModalOpen, setIsBelvoModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransactionsHistoryModalOpen, setIsTransactionsHistoryModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState(null);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState(null);
  const [selectedAccountForIncome, setSelectedAccountForIncome] = useState(null);
  const [belvoLinks, setBelvoLinks] = useState([]);
  const [disconnectingLinkId, setDisconnectingLinkId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });

  useEffect(() => {
    if (organization?.id) {
      fetchAccounts();
      fetchBelvoLinks();
    }
  }, [organization?.id]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .select(`
          *,
          cost_center:cost_centers(name),
          bank_account_shares(
            percentage,
            cost_center:cost_centers(name)
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Oculta contas Belvo desativadas (foram removidas/desconectadas)
      const filteredAccounts = (data || []).filter(account => {
        if (account.provider === 'belvo') {
          return account.is_active;
        }
        return true;
      });

      setAccounts(filteredAccounts);
      calculateStats(filteredAccounts);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBelvoLinks = async () => {
    try {
      const response = await fetch(`/api/belvo/links?organization_id=${organization.id}`);
      const result = await response.json();
      
      if (result.success && result.links) {
        // Filter only active links (not deleted)
        const activeLinks = result.links.filter(link => link.status !== 'deleted');
        setBelvoLinks(activeLinks);
      }
    } catch (error) {
      console.error('Erro ao buscar links Belvo:', error);
    }
  };

  // Remover conta Open Finance individual (apenas marca como inativa)
  const handleRemoveBelvoAccount = async (account) => {
    setConfirmModal({
      isOpen: true,
      title: t('web.bankAccounts.removeAccountFromTheApp'),
      message: t('web.bankAccounts.removeFromMeuazulaoTheAccount', { name: account.name }),
      type: 'warning',
      onConfirm: async () => {
        try {
          setConfirmModal({ ...confirmModal, isOpen: false });

          const { error } = await supabase
            .from('bank_accounts')
            .update({ is_active: false })
            .eq('id', account.id);

          if (error) throw error;

          success(t('web.bankAccounts.accountRemoved'));
          await fetchAccounts();
        } catch (error) {
          console.error('Error removing account:', error);
          showError(t('web.bankAccounts.couldnTRemoveTheAccount'));
        }
      }
    });
  };

  const calculateStats = (accountsData) => {
    const totalBalance = accountsData.reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);
    const positiveBalance = accountsData.filter(acc => parseFloat(acc.current_balance || 0) > 0)
      .reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0);
    const negativeBalance = Math.abs(accountsData.filter(acc => parseFloat(acc.current_balance || 0) < 0)
      .reduce((sum, acc) => sum + parseFloat(acc.current_balance || 0), 0));

    setStats({
      totalBalance,
      positiveBalance,
      negativeBalance,
      totalAccounts: accountsData.length
    });
  };

  const handleOpenModal = (account = null) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleToggleActive = async (account) => {
    // Only for manual accounts
    const action = account.is_active ? 'desativar' : 'reativar';
    
    setConfirmModal({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} conta`,
      message: t('web.bankAccounts.doYouWantTo', { action, name: account.name }),
      type: account.is_active ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          setConfirmModal({ ...confirmModal, isOpen: false });
          
          const { error } = await supabase
            .from('bank_accounts')
            .update({ is_active: !account.is_active })
            .eq('id', account.id);

          if (error) throw error;
          await fetchAccounts();
        } catch (error) {
          console.error('Erro ao atualizar status da conta:', error);
          showError(t('web.bankAccounts.couldnTUpdateTheAccount') + (error.message || t('web.shared.unknownError')));
        }
      }
    });
  };

  const getAccountTypeLabel = (type) => {
    const typeLabels = {
      'checking': t('web.bankAccounts.checking'),
      'savings': t('web.bankAccounts.savings'),
      'pension': t('web.bankAccounts.retirement'),
      'investment': t('web.shared.investing'),
      'loan': t('web.bankAccounts.loan')
    };
    return typeLabels[type] || t('web.bankAccounts.account');
  };

  const getOwnerLabel = (account) => {
    if (account.owner_type === 'individual') {
      return account.cost_center?.name || t('web.shared.individual');
    } else {
      const shares = account.bank_account_shares || [];
      return shares.map(s => s.cost_center.name).join(', ') || t('web.shared.shared');
    }
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  return (
    <>
      <Header organization={organization} user={user} pageTitle={t('web.bankAccounts.bankAccounts')}>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('web.bankAccounts.bankAccounts')}</h1>
            <p className="text-gray-600 mt-1">{t('web.bankAccounts.yourCheckingAndSavingsAccounts')}</p>
          </div>
          <Button 
            onClick={() => setIsAccountTypeModalOpen(true)} 
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('web.bankAccounts.addAccount')}
          </Button>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatsCard
            title={t('web.bankAccounts.totalInAccounts')}
            value={`R$ ${stats.totalBalance.toFixed(2)}`}
            icon={DollarSign}
            trend={stats.totalBalance >= 0 ? 'up' : 'down'}
          />
          <StatsCard
            title={t('web.bankAccounts.positiveBalance')}
            value={`R$ ${stats.positiveBalance.toFixed(2)}`}
            icon={TrendingUp}
            trend="up"
          />
          <StatsCard
            title={t('web.bankAccounts.negativeBalance')}
            value={`R$ ${stats.negativeBalance.toFixed(2)}`}
            icon={TrendingDown}
            trend="down"
          />
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('web.bankAccounts.noBankAccountsYet')}</h3>
              <p className="text-gray-600 mb-4">{t('web.bankAccounts.addYourFirstAccountTo')}</p>
              <Button 
                onClick={() => handleOpenModal()} 
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('web.bankAccounts.addFirstAccount')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <Card key={account.id} className="border border-flight-blue/20 bg-white shadow-lg hover:shadow-xl transition-all duration-200">
                <CardContent className="bg-flight-blue/5 p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                      {!account.is_active && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          {t('web.bankAccounts.inactive')}
                        </span>
                      )}
                        {account.provider === 'belvo' && (
                          <Tooltip content="Conectada via Open Finance - Sincronização automática (somente leitura)" position="top">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              Open Finance
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-right ml-auto">
                        <h3 className="font-semibold text-gray-900">{account.name}</h3>
                        <p className="text-sm text-gray-500">{account.bank}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('web.bankAccounts.type')}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {getAccountTypeLabel(account.account_type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('web.bankAccounts.currentBalance')}</p>
                      <p className={`text-2xl font-bold ${
                        parseFloat(account.current_balance || 0) >= 0
                          ? 'text-flight-blue'
                          : 'text-red-600'
                      }`}>
                        R$ {parseFloat(account.current_balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('web.bankAccounts.ownership')}</p>
                      <p className="text-sm text-gray-700">{getOwnerLabel(account)}</p>
                    </div>
                    {account.provider === 'belvo' ? (
                      /* Open Finance accounts: Read-only, show only history and remove */
                      <div className="flex justify-center space-x-2 pt-4 border-t border-gray-200">
                        <Tooltip content="Ver histórico de transações" position="top">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedAccountForHistory(account);
                              setIsTransactionsHistoryModalOpen(true);
                            }}
                            className="text-gray-600 border-gray-200 hover:bg-gray-50"
                            aria-label={t('web.bankAccounts.seeHistory')}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Remover do app" position="top">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveBelvoAccount(account)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            aria-label={t('web.bankAccounts.removeFromApp')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    ) : (
                      /* Manual accounts: Full control */
                    <div className="flex justify-center space-x-2 pt-4 border-t border-gray-200">
                      <Tooltip content="Adicionar Entrada" position="top">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedAccountForIncome(account);
                            setIsIncomeModalOpen(true);
                          }}
                          className="text-flight-blue border-flight-blue/20 hover:bg-flight-blue/10"
                          aria-label={t('web.bankAccounts.addIncome')}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Transferir" position="top">
                      <Button
                          variant="outline"
                          size="icon"
                        onClick={() => {
                          setSelectedAccountForTransaction(account);
                          setIsTransactionModalOpen(true);
                        }}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          aria-label={t('web.bankAccounts.transfer')}
                      >
                          <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      </Tooltip>
                      <Tooltip content="Ver histórico" position="top">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedAccountForHistory(account);
                            setIsTransactionsHistoryModalOpen(true);
                          }}
                          className="text-gray-600 border-gray-200 hover:bg-gray-50"
                          aria-label={t('web.bankAccounts.seeHistory')}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Editar" position="top">
                      <Button
                        variant="outline"
                          size="icon"
                        onClick={() => handleOpenModal(account)}
                          aria-label={t('web.bankAccounts.editAccount')}
                      >
                          <Edit className="h-4 w-4" />
                      </Button>
                      </Tooltip>
                      <Tooltip content="Desativar" position="top">
                      <Button
                        variant="outline"
                          size="icon"
                        onClick={() => handleToggleActive(account)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                          aria-label={t('web.bankAccounts.deactivateAccount')}
                      >
                          <Trash2 className="h-4 w-4" />
                      </Button>
                      </Tooltip>
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      </Header>

      <AccountTypeSelectionModal
        isOpen={isAccountTypeModalOpen}
        onClose={() => setIsAccountTypeModalOpen(false)}
        onSelectOpenFinance={() => {
          setIsAccountTypeModalOpen(false);
          setIsBelvoModalOpen(true);
        }}
        onSelectManual={() => {
          setIsAccountTypeModalOpen(false);
          handleOpenModal();
        }}
      />

      <BankAccountModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        account={editingAccount}
        costCenters={costCenters}
        organizationId={organization?.id}
        organization={organization}
        user={user}
        onSuccess={fetchAccounts}
      />
      
      <BankTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setSelectedAccountForTransaction(null);
        }}
        account={selectedAccountForTransaction}
        organizationId={organization?.id}
        onSuccess={fetchAccounts}
      />
      
      <BankIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setSelectedAccountForIncome(null);
        }}
        organization={organization}
        costCenters={costCenters}
        incomeCategories={incomeCategories}
        selectedAccount={selectedAccountForIncome}
        currentUser={user}
        onSuccess={fetchAccounts}
      />
      
      <BankTransactionsModal
        isOpen={isTransactionsHistoryModalOpen}
        onClose={() => {
          setIsTransactionsHistoryModalOpen(false);
          setSelectedAccountForHistory(null);
        }}
        account={selectedAccountForHistory}
        organization={organization}
      />
      
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={t('web.shared.confirm')}
        cancelText={t('web.shared.cancel')}
      />
    </>
  );
}


