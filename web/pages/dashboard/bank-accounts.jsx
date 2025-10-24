import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import BankAccountModal from '../../components/BankAccountModal';
import BankTransactionModal from '../../components/BankTransactionModal';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import LoadingLogo from '../../components/LoadingLogo';
import { Plus, Building2, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import StatsCard from '../../components/ui/StatsCard';

export default function BankAccounts() {
  const router = useRouter();
  const { organization, user, costCenters, loading: orgLoading } = useOrganization();
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    positiveBalance: 0,
    negativeBalance: 0,
    totalAccounts: 0
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState(null);

  useEffect(() => {
    if (organization?.id) {
      fetchAccounts();
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

      setAccounts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao buscar contas bancárias:', error);
    } finally {
      setLoading(false);
    }
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
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id);

      if (error) throw error;
      await fetchAccounts();
    } catch (error) {
      console.error('Erro ao atualizar status da conta:', error);
      alert('Erro ao atualizar status da conta');
    }
  };

  const getAccountTypeLabel = (type) => {
    return type === 'checking' ? 'Conta Corrente' : 'Poupança';
  };

  const getOwnerLabel = (account) => {
    if (account.owner_type === 'individual') {
      return account.cost_center?.name || 'Individual';
    } else {
      const shares = account.bank_account_shares || [];
      return shares.map(s => s.cost_center.name).join(', ') || 'Compartilhada';
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
    <div className="min-h-screen bg-white flex flex-col">
      <Header organization={organization} user={user} pageTitle="Contas Bancárias" />
      
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
            <p className="text-gray-600 mt-1">Gerencie suas contas corrente e poupança</p>
          </div>
          <Button 
            onClick={() => handleOpenModal()} 
            className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total em Contas"
            value={`R$ ${stats.totalBalance.toFixed(2)}`}
            icon={DollarSign}
            trend={stats.totalBalance >= 0 ? 'up' : 'down'}
          />
          <StatsCard
            title="Saldo Positivo"
            value={`R$ ${stats.positiveBalance.toFixed(2)}`}
            icon={TrendingUp}
            trend="up"
          />
          <StatsCard
            title="Saldo Negativo"
            value={`R$ ${stats.negativeBalance.toFixed(2)}`}
            icon={TrendingDown}
            trend="down"
          />
          <StatsCard
            title="Total de Contas"
            value={stats.totalAccounts}
            icon={Building2}
          />
        </div>

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conta bancária</h3>
              <p className="text-gray-600 mb-4">Comece adicionando sua primeira conta</p>
              <Button 
                onClick={() => handleOpenModal()} 
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
              >
                <Plus className="h-5 w-5 mr-2" />
                Criar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg ${
                        account.account_type === 'checking' 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}>
                        <Building2 className={`h-5 w-5 ${
                          account.account_type === 'checking' 
                            ? 'text-blue-600' 
                            : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.name}</h3>
                        <p className="text-sm text-gray-500">{account.bank}</p>
                      </div>
                    </div>
                    {!account.is_active && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        Inativa
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tipo</p>
                      <p className="text-sm font-medium text-gray-900">
                        {getAccountTypeLabel(account.account_type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Saldo Atual</p>
                      <p className={`text-2xl font-bold ${
                        parseFloat(account.current_balance || 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        R$ {parseFloat(account.current_balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Propriedade</p>
                      <p className="text-sm text-gray-700">{getOwnerLabel(account)}</p>
                    </div>
                    <div className="flex flex-col space-y-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccountForTransaction(account);
                          setIsTransactionModalOpen(true);
                        }}
                        className="w-full"
                      >
                        Nova Transação
                      </Button>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(account)}
                          className="flex-1"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(account)}
                          className="flex-1"
                        >
                          {account.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <BankAccountModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        account={editingAccount}
        costCenters={costCenters}
        onSuccess={fetchAccounts}
      />
      
      <BankTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setSelectedAccountForTransaction(null);
        }}
        account={selectedAccountForTransaction}
        onSuccess={fetchAccounts}
      />
      
      <Footer />
    </div>
  );
}

