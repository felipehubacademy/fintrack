import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import {
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  HelpCircle,
  Link2,
  List,
  ArrowRightLeft,
  Plus,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { colors, spacing, radius, shadows } from '../theme';
import { Text, Title2, Headline, Callout, Caption } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingLogo from '../components/ui/LoadingLogo';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { StatCard } from '../components/financial/StatCard';
import { BankIcon } from '../components/financial/BankIcon';
import { CardBrandIcon } from '../components/financial/CardBrandIcon';
import { formatCurrency } from '@fintrack/shared/utils';
import { StatsDetailSheet } from '../components/financial/StatsDetailSheet';
import { BankAccountsSheet } from '../components/financial/BankAccountsSheet';
import { CardFormModal } from '../components/financial/CardFormModal';
import { BankAccountFormModal } from '../components/financial/BankAccountFormModal';
import { getCurrentMonthKey } from '../utils/monthRange';
import BankTransactionModal from '../components/financial/BankTransactionModal';
import BankIncomeModal from '../components/financial/BankIncomeModal';
import BankTransactionsModal from '../components/financial/BankTransactionsModal';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';

const { width } = Dimensions.get('window');
const STAT_CARD_WIDTH = (width - spacing[2] * 3) / 2.2;

const CARD_COLOR_MAP = {
  'bg-blue-600': '#2563EB',
  'bg-orange-600': '#EA580C',
  'bg-purple-600': '#9333EA',
  'bg-green-600': '#16A34A',
  'bg-gray-600': '#4B5563',
  'bg-red-600': '#DC2626',
};

const getMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return { startDate, endDate };
};

const resolveCardColor = (color) => {
  if (!color) return colors.brand.primary;
  if (color.startsWith('#')) return color;
  return CARD_COLOR_MAP[color] || colors.brand.primary;
};

const getAccountTypeLabel = (type) => {
  const typeLabels = {
    'checking': 'Conta Corrente',
    'savings': 'Poupança',
    'pension': 'Previdência',
    'investment': 'Investimento',
    'loan': 'Empréstimo'
  };
  return typeLabels[type] || 'Conta';
};

const getOwnerLabel = (account) => {
  if (account.owner_type === 'individual') {
    return account.cost_center?.name || 'Individual';
  } else {
    const shares = account.bank_account_shares || [];
    return shares.map(s => s.cost_center?.name).filter(Boolean).join(', ') || 'Compartilhada';
  }
};

// Removido ACCOUNT_COLORS - usando apenas cores da app

export default function FinancesScreen({ navigation }) {
  const { organization, user, loading: orgLoading } = useOrganization();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedTab, setSelectedTab] = useState('cards'); // cards, accounts
  const [invoiceSheetVisible, setInvoiceSheetVisible] = useState(false);
  const [invoiceSheetData, setInvoiceSheetData] = useState([]);
  const [invoiceSheetTitle, setInvoiceSheetTitle] = useState('Faturas por Cartão');
  const [bankAccountsSheetVisible, setBankAccountsSheetVisible] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [transactionsHistoryModalVisible, setTransactionsHistoryModalVisible] = useState(false);
  const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState(null);
  const [selectedAccountForIncome, setSelectedAccountForIncome] = useState(null);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState(null);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  useEffect(() => {
    if (organization) {
      loadFinanceData();
    }
  }, [organization]);

  const loadFinanceData = async () => {
    try {
      if (!organization) return;

      setLoading(true);

      // Data do mês atual
      const { startDate, endDate } = getMonthRange();

      // Buscar cartões
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (cardsError) throw cardsError;

      // Buscar despesas de cartão do mês para cada cartão
      if (cardsData && cardsData.length > 0) {
        const cardsWithExpenses = await Promise.all(
          cardsData.map(async (card) => {
            const { data: expenses } = await supabase
              .from('expenses')
              .select('amount')
              .eq('organization_id', organization.id)
              .eq('card_id', card.id)
              .eq('status', 'confirmed')
              .gte('date', startDate)
              .lte('date', endDate);

            const monthExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
            
            return {
              ...card,
              current_balance: monthExpenses, // Gastos do mês
            };
          })
        );
        setCards(cardsWithExpenses);
      } else {
        setCards([]);
      }

      // Buscar contas bancárias ATIVAS com relacionamentos
      const { data: accountsData, error: accountsError } = await supabase
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (accountsError) throw accountsError;

      setBankAccounts(accountsData || []);

      // Buscar categorias de receita
      const { data: incomeCategoriesData, error: incomeCategoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`organization_id.eq.${organization.id},organization_id.is.null`)
        .eq('type', 'income');

      if (!incomeCategoriesError) {
        setIncomeCategories(incomeCategoriesData || []);
      }

      // Buscar cost centers
      const { data: costCentersData, error: costCentersError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (!costCentersError) {
        setCostCenters(costCentersData || []);
      }
    } catch (error) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFinanceData();
  };

  const getTotalCards = () => {
    // Total de gastos do mês em todos os cartões
    return cards.reduce((sum, card) => sum + (card.current_balance || 0), 0);
  };

  const getTotalAccounts = () => {
    return bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || acc.balance || 0), 0);
  };

  const creditCards = useMemo(
    () => cards.filter((card) => card.type === 'credit'),
    [cards]
  );

  const cardStats = useMemo(() => {
    if (!creditCards.length) {
      return {
        totalLimit: 0,
        totalAvailable: 0,
        totalUsed: 0,
        usagePct: 0,
      };
    }

    const totalLimit = creditCards.reduce(
      (sum, card) => sum + Number(card.credit_limit || 0),
      0
    );
    const totalUsed = creditCards.reduce(
      (sum, card) => sum + Number(card.current_balance || 0),
      0
    );
    const totalAvailable = Math.max(0, totalLimit - totalUsed);
    const usagePct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

    return { totalLimit, totalAvailable, totalUsed, usagePct };
  }, [creditCards]);

  const invoiceEntries = useMemo(() => {
    return creditCards
      .map((card) => ({
        id: card.id,
        name: card.name,
        amount: Number(card.current_balance || 0),
        color: card.color || null,
      }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [creditCards]);

  const totalInvoices = useMemo(
    () => invoiceEntries.reduce((sum, entry) => sum + entry.amount, 0),
    [invoiceEntries]
  );

  const accountStats = useMemo(() => {
    if (!bankAccounts.length) {
      return {
        totalBalance: 0,
        positiveBalance: 0,
        negativeBalance: 0,
      };
    }

    const balances = bankAccounts.map((acc) =>
      Number(acc.current_balance || acc.balance || 0)
    );
    const totalBalance = balances.reduce((sum, value) => sum + value, 0);
    const positiveBalance = balances
      .filter((value) => value > 0)
      .reduce((sum, value) => sum + value, 0);
    const negativeBalance = Math.abs(
      balances.filter((value) => value < 0).reduce((sum, value) => sum + value, 0)
    );

    return {
      totalBalance,
      positiveBalance,
      negativeBalance,
    };
  }, [bankAccounts]);

  const handleOpenInvoiceSheet = () => {
    if (!invoiceEntries.length) return;

    const sheetData = invoiceEntries.map((entry) => ({
      label: entry.name,
      value: entry.amount,
      percentage:
        totalInvoices > 0
          ? Number(((entry.amount / totalInvoices) * 100).toFixed(1))
          : undefined,
    }));

    setInvoiceSheetTitle('Faturas por Cartão');
    setInvoiceSheetData(sheetData);
    setInvoiceSheetVisible(true);
  };

  const handleOpenCardInvoice = async (card) => {
    try {
      const { startDate, endDate } = getMonthRange();
      const { data, error } = await supabase
        .from('expenses')
        .select('id, description, date, amount')
        .eq('card_id', card.id)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const sheetData = (data || []).map((expense) => ({
        label: expense.description,
        value: Number(expense.amount || 0),
        subtitle: formatBrazilDate(expense.date),
      }));

      setInvoiceSheetTitle(`Fatura - ${card.name}`);
      setInvoiceSheetData(sheetData);
      setInvoiceSheetVisible(true);
    } catch (error) {showToast('Não foi possível carregar a fatura deste cartão.', 'error');
    }
  };

  const handleOpenCardModal = (card = null) => {
    setEditingCard(card);
    setCardModalVisible(true);
  };

  const handleCloseCardModal = () => {
    setEditingCard(null);
    setCardModalVisible(false);
  };

  const handleSaveCard = async (formValues) => {
    try {
      const payload = {
        name: formValues.name.trim(),
        bank: formValues.bank?.trim() || null,
        holder_name: formValues.holder_name?.trim() || null,
        type: 'credit', // Sempre crédito
        credit_limit: Number(formValues.credit_limit || 0),
        best_day: formValues.best_day ? Number(formValues.best_day) : null,
        billing_day: formValues.billing_day ? Number(formValues.billing_day) : null,
        closing_day: formValues.closing_day ? Number(formValues.closing_day) : null,
        color: formValues.color,
      };

      if (editingCard) {
        const { error } = await supabase
          .from('cards')
          .update(payload)
          .eq('id', editingCard.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cards').insert([{
          ...payload,
          organization_id: organization.id,
          owner_id: user?.id || null,
          is_active: true,
          // Não definir available_limit - deixar o sistema calcular
        }]);
        
        if (error) throw error;
      }

      handleCloseCardModal();
      await loadFinanceData();
    } catch (error) {showToast('Não foi possível salvar o cartão.', 'error');
    }
  };

  const handleOpenAccountModal = (account = null) => {
    setEditingAccount(account);
    setAccountModalVisible(true);
  };

  const handleCloseAccountModal = () => {
    setEditingAccount(null);
    setAccountModalVisible(false);
  };

  const handleSaveAccount = async (formValues) => {
    try {
      const payload = {
        name: formValues.name.trim(),
        bank: formValues.bank?.trim() || null,
        account_type: formValues.account_type,
        current_balance: Number(formValues.current_balance || 0),
        is_active: formValues.is_active,
      };

      if (editingAccount) {
        await supabase
          .from('bank_accounts')
          .update(payload)
          .eq('id', editingAccount.id);
      } else {
        await supabase.from('bank_accounts').insert([
          {
            ...payload,
            organization_id: organization.id,
            user_id: user?.id || null,
            provider: 'manual',
          },
        ]);
      }

      handleCloseAccountModal();
      await loadFinanceData();
    } catch (error) {showToast('Não foi possível salvar a conta.', 'error');
    }
  };

  const handleAccountEntry = (account) => {
    setSelectedAccountForIncome(account);
    setIncomeModalVisible(true);
  };

  const handleAccountTransfer = (account) => {
    setSelectedAccountForTransaction(account);
    setTransactionModalVisible(true);
  };

  const handleAccountHistory = (account) => {
    setSelectedAccountForHistory(account);
    setTransactionsHistoryModalVisible(true);
  };

  const handleToggleAccountActive = async (account) => {
    const action = account.is_active ? 'desativar' : 'reativar';
    try {
      await confirm({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} conta`,
        message: `Tem certeza que deseja ${action} a conta "${account.name}"?`,
        type: account.is_active ? 'warning' : 'info',
        confirmText: account.is_active ? 'Desativar' : 'Ativar',
        onConfirm: async () => {
          try {
            await supabase
              .from('bank_accounts')
              .update({ is_active: !account.is_active })
              .eq('id', account.id);
            await loadFinanceData();
          } catch (error) {
            throw error;
          }
        },
      });
    } catch (error) {
      // Usuário cancelou ou erro ocorreu
    }
  };

  const handleRemoveBelvoAccount = async (account) => {
    try {
      await confirm({
        title: 'Remover conta do app',
        message: `Deseja remover "${account.name}" do MeuAzulão?\n\nA conta será ocultada, mas a sincronização Open Finance com o banco continuará ativa.\n\nVocê pode adicionar esta conta novamente em Configurações > Open Finance.`,
        type: 'warning',
        confirmText: 'Remover',
        onConfirm: async () => {
          try {
            await supabase
              .from('bank_accounts')
              .update({ is_active: false })
              .eq('id', account.id);
            await loadFinanceData();
          } catch (error) {
            throw error;
          }
        },
      });
    } catch (error) {
      // Usuário cancelou ou erro ocorreu
    }
  };

  const handleAddPress = () => {
    if (selectedTab === 'cards') {
      handleOpenCardModal(null);
      return;
    }
    handleOpenAccountModal(null);
  };

  const handleDeleteCard = async (card) => {
    try {
      await confirm({
        title: 'Excluir cartão',
        message: `Deseja excluir "${card.name}"?`,
        type: 'danger',
        confirmText: 'Excluir',
        onConfirm: async () => {
          try {
            await supabase
              .from('cards')
              .update({ is_active: false })
              .eq('id', card.id);
            await loadFinanceData();
          } catch (error) {
            throw error;
          }
        },
      });
    } catch (error) {
      // Usuário cancelou ou erro ocorreu
    }
  };

  if (orgLoading || loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader user={user} title="Finanças" showLogo={true} rightIcon={<CreditCard size={24} color={colors.text.secondary} />} />
        <LoadingLogo fullScreen message="Carregando finanças..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Consistente - Igual Dashboard e Transações */}
      <ScreenHeader
        user={user}
        title="Finanças"
        showLogo={true}
        rightIcon={<Plus size={24} color={colors.text.secondary} />}
        onRightIconPress={handleAddPress}
      />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'cards' && styles.tabActive]}
          onPress={() => setSelectedTab('cards')}
        >
          <CreditCard 
            size={20} 
            color={selectedTab === 'cards' ? colors.brand.primary : colors.text.secondary} 
          />
          <Text 
            variant="callout" 
            weight="medium"
            style={{ color: selectedTab === 'cards' ? colors.brand.primary : colors.text.secondary }}
          >
            Cartões
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'accounts' && styles.tabActive]}
          onPress={() => setSelectedTab('accounts')}
        >
          <Wallet 
            size={20} 
            color={selectedTab === 'accounts' ? colors.brand.primary : colors.text.secondary} 
          />
          <Text 
            variant="callout" 
            weight="medium"
            style={{ color: selectedTab === 'accounts' ? colors.brand.primary : colors.text.secondary }}
          >
            Contas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Estrutura igual Dashboard e Transações */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'cards' ? (
          <>
            {/* KPIs de cartões - Scroll horizontal igual Dashboard e Transações */}
            {creditCards.length > 0 && (
              <View style={styles.section}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statsScroll}
                  snapToInterval={STAT_CARD_WIDTH + spacing[2]}
                  decelerationRate="fast"
                >
                  <StatCard
                    label="Limite Total"
                    value={formatCurrency(cardStats.totalLimit)}
                    icon={<CreditCard size={20} color={colors.brand.primary} />}
                    style={{ width: STAT_CARD_WIDTH }}
                  />
                  
                  <StatCard
                    label="Disponível"
                    value={formatCurrency(cardStats.totalAvailable)}
                    icon={<TrendingUp size={20} color={colors.success.main} />}
                    variant="income"
                    style={{ width: STAT_CARD_WIDTH }}
                  />
                  
                  <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
                    <StatCard
                      label="Faturas"
                      value={formatCurrency(totalInvoices)}
                      icon={<TrendingDown size={20} color={colors.warning.main} />}
                      variant="expense"
                      style={{ width: STAT_CARD_WIDTH }}
                      onPress={invoiceEntries.length ? handleOpenInvoiceSheet : undefined}
                    />
                    {invoiceEntries.length > 0 && (
                      <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                        <HelpCircle size={14} color={colors.text.tertiary} />
                </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        ) : null}

        {selectedTab === 'cards' ? (
          cards.length === 0 ? (
            <View style={styles.section}>
            <EmptyState
              icon={<CreditCard size={48} color={colors.text.tertiary} />}
              title="Nenhum cartão cadastrado"
              description="Adicione seus cartões para acompanhar os gastos"
            />
            </View>
          ) : (
            <View style={styles.section}>
            <View style={styles.list}>
              {cards.map((card) => {
                const cardColor = resolveCardColor(card.color);
                const limit = Number(card.credit_limit || 0);
                const used = Number(card.current_balance || 0);
                const available = Math.max(0, limit - used);
                const usagePct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

                return (
                    <TouchableOpacity
                    key={card.id}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate('CardDetail', {
                          cardId: card.id,
                          selectedMonth: currentMonthKey,
                        })
                      }
                    style={styles.cardWrapper}
                    >
                      <View style={[styles.cardVisual, { backgroundColor: cardColor }]}>
                      {/* Canto superior: Logo do banco à esquerda, Nome e Banco à direita */}
                      <View style={styles.cardTop}>
                        <View style={styles.cardTopLeft}>
                          <BankIcon bankName={card.bank} size={32} style={styles.bankIcon} />
                        </View>
                        <View style={styles.cardTopRight}>
                          <View style={styles.cardNameContainer}>
                        <Text variant="headline" weight="semiBold" style={styles.cardName}>
                          {card.name}
                        </Text>
                        <Caption style={styles.cardBank}>
                          {card.bank || 'Banco não informado'}
                        </Caption>
                      </View>
                          </View>
                          </View>

                      {/* Parte inferior: Titular à esquerda, Fatura à direita */}
                      <View style={styles.cardBottom}>
                        <View style={styles.cardBottomLeft}>
                          <Caption style={styles.cardHolder}>
                            {card.holder_name || 'Não informado'}
                          </Caption>
                          </View>

                        {card.type === 'credit' && (
                          <View style={styles.cardBottomRight}>
                          <View style={styles.progressContainer}>
                              <View style={styles.progressHeader}>
                                <Caption style={styles.progressLabel}>Limite utilizado</Caption>
                                <Caption style={styles.progressPercentage}>
                                  {usagePct.toFixed(0)}%
                                </Caption>
                              </View>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${usagePct}%`,
                                    backgroundColor:
                                      usagePct >= 90
                                          ? colors.neutral[0]
                                        : usagePct >= 70
                                          ? colors.neutral[0]
                                          : colors.neutral[0],
                                      opacity: 0.9,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                            <View style={styles.invoiceContainer}>
                              <Caption style={styles.invoiceLabel}>Fatura atual</Caption>
                              <Callout weight="bold" style={styles.cardInvoiceAmount}>
                                {formatCurrency(used)}
                              </Callout>
                          </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              </View>
            </View>
          )
        ) : (
          <>
            {/* KPIs de contas - Scroll horizontal igual Dashboard e Transações */}
            {bankAccounts.length > 0 && (
              <View style={styles.section}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statsScroll}
                  snapToInterval={STAT_CARD_WIDTH + spacing[2]}
                  decelerationRate="fast"
                >
                  <StatCard
                    label="Total"
                    value={formatCurrency(accountStats.totalBalance)}
                    icon={<Wallet size={20} color={colors.brand.primary} />}
                    style={{ width: STAT_CARD_WIDTH }}
                    onPress={() => setBankAccountsSheetVisible(true)}
                  />
                  
                  <StatCard
                    label="Positivo"
                    value={formatCurrency(accountStats.positiveBalance)}
                    icon={<TrendingUp size={20} color={colors.success.main} />}
                    variant="income"
                    style={{ width: STAT_CARD_WIDTH }}
                  />
                  
                  <StatCard
                    label="Negativo"
                    value={formatCurrency(accountStats.negativeBalance)}
                    icon={<TrendingDown size={20} color={colors.error.main} />}
                    variant="expense"
                    style={{ width: STAT_CARD_WIDTH }}
                  />
                </ScrollView>
              </View>
            )}

            {bankAccounts.length === 0 ? (
              <View style={styles.section}>
              <EmptyState
                icon={<Wallet size={48} color={colors.text.tertiary} />}
                title="Nenhuma conta cadastrada"
                description="Conecte suas contas bancárias"
              />
              </View>
            ) : (
              <View style={styles.section}>
              <View style={styles.list}>
              {bankAccounts.map((account) => {
                const balance = Number(account.current_balance || account.balance || 0);
                const accountTypeLabel = getAccountTypeLabel(account.account_type);
                
                return (
                    <TouchableOpacity
                    key={account.id}
                    activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('BankAccountDetail', {
                          accountId: account.id,
                          selectedMonth: currentMonthKey,
                        })
                      }
                    style={styles.accountCard}
                  >
                    {/* Card visual - Layout sóbrio */}
                    <View style={styles.accountCardContent}>
                      {/* Topo: Logo e Nome */}
                      <View style={styles.accountCardTop}>
                        <View style={styles.accountCardLeft}>
                          <BankIcon 
                            bankName={account.bank || account.institution_name} 
                            size={28} 
                            style={styles.accountBankIcon} 
                          />
                        </View>
                        <View style={styles.accountCardRight}>
                          <Text variant="headline" weight="semiBold" style={styles.accountCardName}>
                            {account.name || account.nickname || 'Conta'}
                          </Text>
                          <Caption color="secondary" style={styles.accountCardBank}>
                            {account.bank || account.institution_name || 'Banco'}
                          </Caption>
                        </View>
                      </View>

                      {/* Badges */}
                      <View style={styles.accountCardBadges}>
                        {account.provider === 'belvo' && (
                          <View style={styles.accountBadge}>
                            <Link2 size={10} color={colors.brand.primary} />
                            <Caption weight="semiBold" style={{ color: colors.brand.primary }}>
                                Open Finance
                              </Caption>
                            </View>
                          )}
                          {!account.is_active && (
                          <View style={[styles.accountBadge, { backgroundColor: colors.error.bg }]}>
                            <Caption weight="semiBold" style={{ color: colors.error.main }}>
                                Inativa
                              </Caption>
                            </View>
                          )}
                        </View>

                      {/* Informações */}
                      <View style={styles.accountCardInfo}>
                        <View style={styles.accountCardInfoLeft}>
                          <Caption color="secondary">{accountTypeLabel}</Caption>
                          <Caption color="tertiary" style={{ marginTop: spacing[0.5] }}>
                            {getOwnerLabel(account)}
                        </Caption>
                      </View>
                        <View style={styles.accountCardInfoRight}>
                          <Caption color="secondary">Saldo</Caption>
                          <Text variant="headline" weight="bold" style={styles.accountCardBalance}>
                        {formatCurrency(balance)}
                          </Text>
                    </View>
                    </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
                </View>
            </View>
            )}
          </>
        )}

        {/* Espaçamento final - Igual Dashboard e Transações */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      <StatsDetailSheet
        visible={invoiceSheetVisible}
        onClose={() => {
          setInvoiceSheetVisible(false);
          setInvoiceSheetData([]);
        }}
        title={invoiceSheetTitle}
        data={invoiceSheetData}
      />

      <CardFormModal
        visible={cardModalVisible}
        onClose={handleCloseCardModal}
        onSave={handleSaveCard}
        card={editingCard}
      />

      <BankAccountFormModal
        visible={accountModalVisible}
        onClose={handleCloseAccountModal}
        onSave={handleSaveAccount}
        account={editingAccount}
      />

      <BankTransactionModal
        visible={transactionModalVisible}
        onClose={() => {
          setTransactionModalVisible(false);
          setSelectedAccountForTransaction(null);
        }}
        account={selectedAccountForTransaction}
        organizationId={organization?.id}
        onSuccess={loadFinanceData}
      />

      <BankIncomeModal
        visible={incomeModalVisible}
        onClose={() => {
          setIncomeModalVisible(false);
          setSelectedAccountForIncome(null);
        }}
        onSuccess={loadFinanceData}
        organization={organization}
        costCenters={costCenters}
        incomeCategories={incomeCategories}
        selectedAccount={selectedAccountForIncome}
        currentUser={user}
      />

      <BankTransactionsModal
        visible={transactionsHistoryModalVisible}
        onClose={() => {
          setTransactionsHistoryModalVisible(false);
          setSelectedAccountForHistory(null);
        }}
        account={selectedAccountForHistory}
        organization={organization}
        selectedMonth={currentMonthKey}
      />

      {/* Bank Accounts Sheet */}
      <BankAccountsSheet
        visible={bankAccountsSheetVisible}
        onClose={() => setBankAccountsSheetVisible(false)}
        accounts={bankAccounts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },

  header: {
    backgroundColor: colors.background.secondary,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },

  avatarContainer: {
    ...shadows.sm,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
  },

  avatarPlaceholder: {
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    flex: 1,
  },

  iconButton: {
    padding: spacing[1],
  },

  summarySection: {
    paddingVertical: spacing[3],
    backgroundColor: colors.background.secondary,
  },

  kpiSection: {
    backgroundColor: colors.background.secondary,
    paddingTop: spacing[3],
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },

  kpiCard: {
    flexBasis: '48%',
    padding: spacing[2],
    gap: spacing[1],
  },

  kpiCardFull: {
    flexBasis: '100%',
  },

  kpiCardDisabled: {
    opacity: 0.5,
  },

  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  kpiIcon: {
    padding: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.background.primary,
  },

  kpiSubtext: {
    color: colors.text.tertiary,
  },

  invoiceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[1],
  },

  summaryScroll: {
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },

  summaryCard: {
    width: 200,
    padding: spacing[3],
    gap: spacing[0.5],
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[1],
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  tabActive: {
    borderBottomColor: colors.brand.primary,
  },

  statsScroll: {
    gap: spacing[1.5],
  },

  accountsStatsSection: {
    backgroundColor: colors.background.secondary,
    paddingBottom: spacing[3],
  },

  accountsStatsGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    flexWrap: 'wrap',
  },

  accountsStatCard: {
    flex: 1,
    padding: spacing[3],
    minWidth: 160,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },

  section: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },

  list: {
    gap: spacing[2],
  },

  // Account Card - Layout sóbrio
  accountCard: {
    marginBottom: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    ...shadows.sm,
  },

  accountCardContent: {
    padding: spacing[3],
  },

  accountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },

  accountCardLeft: {
    marginRight: spacing[2],
  },

  accountCardRight: {
    flex: 1,
  },

  accountCardName: {
    marginBottom: spacing[0.5],
  },

  accountCardBank: {
    fontSize: 12,
  },

  accountCardBadges: {
    flexDirection: 'row',
    gap: spacing[1],
    marginBottom: spacing[2],
    flexWrap: 'wrap',
  },

  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radius.round,
    backgroundColor: colors.brand.bg,
  },

  accountCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  accountCardInfoLeft: {
    flex: 1,
  },

  accountCardInfoRight: {
    alignItems: 'flex-end',
  },

  accountCardBalance: {
    marginTop: spacing[0.5],
  },

  accountTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'auto',
  },

  accountTopLeft: {
    alignItems: 'flex-start',
  },

  accountTopRight: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: spacing[2],
    gap: spacing[1],
  },

  accountBankIcon: {
    marginBottom: 0,
  },

  accountBadges: {
    flexDirection: 'row',
    gap: spacing[0.5],
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radius.round,
  },

  badgeBlue: {
    backgroundColor: colors.brand.primary + '15',
  },

  badgeWhite: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  badgeMuted: {
    backgroundColor: colors.neutral[100],
  },

  badgeText: {
    color: colors.brand.primary,
  },

  badgeTextWhite: {
    color: colors.neutral[0],
    fontSize: 10,
  },

  badgeTextMuted: {
    color: colors.text.secondary,
  },

  accountNameContainer: {
    alignItems: 'flex-end',
  },

  accountName: {
    color: colors.neutral[0],
    marginBottom: spacing[0.5],
    textAlign: 'right',
  },

  accountBank: {
    color: colors.neutral[0],
    opacity: 0.9,
    textAlign: 'right',
  },

  accountBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  accountBottomLeft: {
    flex: 1,
    marginRight: spacing[2],
  },

  accountTypeLabel: {
    color: colors.neutral[0],
    opacity: 0.85,
    fontSize: 12,
    marginBottom: spacing[0.5],
  },
  accountOwnerLabel: {
    color: colors.neutral[0],
    opacity: 0.75,
    fontSize: 11,
  },

  accountBottomRight: {
    alignItems: 'flex-end',
    gap: spacing[0.5],
  },

  accountBalanceLabel: {
    color: colors.neutral[0],
    opacity: 0.8,
    fontSize: 11,
  },

  accountBalanceAmount: {
    color: colors.neutral[0],
    fontSize: 20,
    fontWeight: '700',
  },

  accountActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingHorizontal: spacing[1],
  },

  accountActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1.5],
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    gap: spacing[2],
  },

  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  itemInfo: {
    flex: 1,
    gap: spacing[0.5],
  },

  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },

  // Card styles - Visual de cartão real
  cardWrapper: {
    marginBottom: spacing[2],
  },

  cardVisual: {
    padding: spacing[3],
    borderRadius: radius.lg,
    height: 200,
    justifyContent: 'space-between',
    ...shadows.md,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'auto',
  },

  cardTopLeft: {
    alignItems: 'flex-start',
  },

  cardTopRight: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: spacing[2],
  },

  bankIcon: {
    marginBottom: 0,
  },

  cardNameContainer: {
    alignItems: 'flex-end',
  },

  cardName: {
    color: colors.neutral[0],
    marginBottom: spacing[0.5],
    textAlign: 'right',
  },

  cardBank: {
    color: colors.neutral[0],
    opacity: 0.9,
    textAlign: 'right',
  },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  cardBottomLeft: {
    flex: 1,
    marginRight: spacing[2],
  },

  cardHolder: {
    color: colors.neutral[0],
    opacity: 0.85,
    fontSize: 14,
  },

  cardBottomRight: {
    alignItems: 'flex-end',
    gap: spacing[1],
    minWidth: 120,
  },

  progressContainer: {
    width: '100%',
    marginBottom: spacing[1],
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[0.5],
  },

  progressLabel: {
    color: colors.neutral[0],
    opacity: 0.8,
    fontSize: 11,
  },

  progressPercentage: {
    color: colors.neutral[0],
    opacity: 0.9,
    fontSize: 11,
    fontWeight: '600',
  },

  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  invoiceContainer: {
    alignItems: 'flex-end',
    marginTop: spacing[0.5],
  },

  invoiceLabel: {
    color: colors.neutral[0],
    opacity: 0.8,
    fontSize: 11,
    marginBottom: spacing[0.25],
  },

  cardInvoiceAmount: {
    color: colors.neutral[0],
    fontSize: 18,
    fontWeight: '700',
  },
});
