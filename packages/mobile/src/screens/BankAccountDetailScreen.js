import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Building2, Edit, TrendingUp, TrendingDown, ArrowRightLeft, List, Link2, Trash2 } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { BankIcon } from '../components/financial/BankIcon';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import BankTransactionModal from '../components/financial/BankTransactionModal';
import BankIncomeModal from '../components/financial/BankIncomeModal';
import BankTransactionsModal from '../components/financial/BankTransactionsModal';
import { BankAccountFormModal } from '../components/financial/BankAccountFormModal';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useToast } from '../components/ui/Toast';
import { orderTransactionsForDisplay } from '../utils/sortTransactions';
import { getMonthRange, getCurrentMonthKey } from '../utils/monthRange';
import { formatBrazilDate } from '../utils/date';
import { MonthSelector } from '../components/financial/MonthSelector';

// Removido ACCOUNT_COLORS - usando apenas cores da app

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

export default function BankAccountDetailScreen({ route, navigation }) {
  const { accountId } = route.params;
  const [selectedMonth, setSelectedMonth] = useState(() => route.params?.selectedMonth || getCurrentMonthKey());
  const { startDate: monthStartDate, endDate: monthEndDate, monthKey: normalizedMonthKey } = useMemo(
    () => getMonthRange(selectedMonth),
    [selectedMonth]
  );
  const { organization, user, loading: orgLoading, refetch: refetchOrganization } = useOrganization();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [transactionsHistoryModalVisible, setTransactionsHistoryModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [costCenters, setCostCenters] = useState([]);

  useEffect(() => {
    if (!orgLoading && organization && accountId) {
      fetchAccountDetails();
      fetchTransactions();
      fetchIncomeCategories();
      fetchCostCenters();
    }
  }, [orgLoading, organization, accountId, monthStartDate, monthEndDate]);

  const fetchIncomeCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`organization_id.eq.${organization.id},organization_id.is.null`)
        .eq('type', 'income');

      if (!error) {
        setIncomeCategories(data || []);
      }
    } catch (error) {}
  };

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (!error) {
        setCostCenters(data || []);
      }
    } catch (error) {}
  };

  const fetchAccountDetails = async () => {
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
        .eq('id', accountId)
        .single();

      if (error) throw error;

      setAccount(data);
      setBalance(data.current_balance || data.balance || 0);
    } catch (error) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .select('*')
        .eq('bank_account_id', accountId)
        .eq('organization_id', organization.id)
        .gte('date', monthStartDate)
        .lte('date', monthEndDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const orderedTransactions = orderTransactionsForDisplay(data || []);
      setTransactions(orderedTransactions);
    } catch (error) {}
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccountDetails();
    fetchTransactions();
    fetchIncomeCategories();
    fetchCostCenters();
  };

  const handleDeleteAccount = async () => {
    try {
      await confirm({
        title: 'Excluir conta',
        message: `Tem certeza que deseja excluir a conta "${account.name}"?\n\nEsta ação não pode ser desfeita.`,
        type: 'danger',
        confirmText: 'Excluir',
        onConfirm: async () => {
          try {
            const { error } = await supabase
              .from('bank_accounts')
              .delete()
              .eq('id', account.id);

            if (error) throw error;

            showToast('Conta excluída com sucesso', 'success');
            navigation.goBack();
            await refetchOrganization();
          } catch (error) {throw error;
          }
        },
      });
    } catch (error) {
      // Usuário cancelou ou erro ocorreu
      if (error.message) {
        showToast('Erro ao excluir conta: ' + error.message, 'error');
      }
    }
  };

  const handleSaveAccount = async (formValues) => {
    try {
      const payload = {
        name: formValues.name,
        bank: formValues.bank,
        account_type: formValues.account_type,
        current_balance: formValues.current_balance ? parseFloat(formValues.current_balance) : 0,
        is_active: formValues.is_active,
      };

      await supabase
        .from('bank_accounts')
        .update(payload)
        .eq('id', account.id);

      setEditModalVisible(false);
      await fetchAccountDetails();
      showToast('Conta atualizada com sucesso', 'success');
    } catch (error) {showToast('Erro ao salvar conta', 'error');
    }
  };

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message="Carregando detalhes..." />;
  }

  if (!account) {
    return (
      <View style={styles.container}>
        <ScreenHeader user={user} title="Conta Bancária" showLogo={true} />
        <EmptyState
          emoji="🏦"
          title="Conta não encontrada"
          description="A conta bancária que você procura não existe."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Detalhes da Conta"
        showBackButton={true}
        rightIcon={
          <TouchableOpacity onPress={() => setEditModalVisible(true)} style={{ padding: spacing[1] }}>
            <Edit size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.monthSelectorWrapper}>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Account Card - Layout sóbrio */}
        <View style={styles.accountCardContainer}>
          <View style={styles.accountCard}>
            {/* Topo: Logo e Nome */}
            <View style={styles.accountCardTop}>
              <View style={styles.accountCardLeft}>
                <BankIcon 
                  bankName={account.bank || account.institution_name} 
                  size={32} 
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
                <Caption color="secondary">{getAccountTypeLabel(account.account_type)}</Caption>
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
        </View>

        {/* Ações rápidas - Todos em uma linha */}
        <View style={styles.actionsSection}>
          {account.provider !== 'belvo' ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIncomeModalVisible(true)}
              >
                <TrendingUp size={18} color={colors.success.main} />
                <Caption weight="semiBold" style={{ color: colors.success.main, marginTop: spacing[0.5], fontSize: 11 }}>
                  Entrada
                </Caption>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setTransactionModalVisible(true)}
              >
                <ArrowRightLeft size={18} color={colors.brand.primary} />
                <Caption weight="semiBold" style={{ color: colors.brand.primary, marginTop: spacing[0.5], fontSize: 11 }}>
                  Transferir
                </Caption>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setTransactionsHistoryModalVisible(true)}
              >
                <List size={18} color={colors.text.primary} />
                <Caption weight="semiBold" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  Histórico
                </Caption>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeleteAccount}
              >
                <Trash2 size={18} color={colors.error.main} />
                <Caption weight="semiBold" style={{ color: colors.error.main, marginTop: spacing[0.5], fontSize: 11 }}>
                  Excluir
                </Caption>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setTransactionsHistoryModalVisible(true)}
              >
                <List size={18} color={colors.text.primary} />
                <Caption weight="semiBold" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                  Histórico
                </Caption>
              </TouchableOpacity>
            </>
          )}
        </View>


        {/* Recent Transactions */}
        <View style={styles.section}>
          <Subheadline weight="semiBold" style={styles.sectionTitle}>
            Movimentações Recentes
          </Subheadline>

          {transactions.length > 0 ? (
            <Card style={{ padding: 0 }}>
              {transactions.map((transaction, index) => {
                const isCredit = ['income_deposit', 'transfer_in'].includes(transaction.transaction_type);
                const getTransactionTypeLabel = (type) => {
                  const labels = {
                    'manual_credit': 'Crédito Manual',
                    'manual_debit': 'Débito Manual',
                    'expense_payment': 'Pagamento de Despesa',
                    'bill_payment': 'Pagamento de Conta',
                    'income_deposit': 'Depósito de Receita',
                    'transfer_in': 'Transferência Recebida',
                    'transfer_out': 'Transferência Enviada',
                  };
                  return labels[type] || type;
                };

                return (
                  <View
                    key={transaction.id}
                    style={[
                      styles.transactionItem,
                      index < transactions.length - 1 && styles.transactionBorder
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Callout weight="medium" numberOfLines={1}>
                        {transaction.description || '-'}
                      </Callout>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing[0.5], gap: spacing[1] }}>
                          <Caption color="secondary">
                            {formatBrazilDate(transaction.date)}
                          </Caption>
                        <Caption color="tertiary" style={{ fontSize: 10 }}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Caption>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Callout
                        weight="bold"
                        style={{
                          color: isCredit ? colors.success.main : colors.error.main,
                          marginLeft: spacing[2],
                        }}
                      >
                        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </Callout>
                      <Caption color="secondary" style={{ marginTop: spacing[0.5], fontSize: 11 }}>
                        Saldo: {formatCurrency(transaction.balance_after)}
                      </Caption>
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : (
            <EmptyState
              emoji="📝"
              title="Nenhuma movimentação"
              description="Ainda não há transações nesta conta."
            />
          )}
        </View>

        {/* Open Finance Section (Future) */}
        <View style={styles.section}>
          <Card style={styles.openFinanceCard}>
            <Callout weight="semiBold" style={{ marginBottom: spacing[1] }}>
              🔗 Conectar Open Finance
            </Callout>
            <Footnote color="secondary">
              Sincronize automaticamente suas transações e saldo diretamente do seu banco.
            </Footnote>
            <TouchableOpacity 
              style={styles.connectButton}
              onPress={() => {}}
              disabled
            >
              <Callout weight="semiBold" style={{ color: colors.neutral[400] }}>
                Em breve
              </Callout>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Spacing for FAB */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Modais */}
      <BankTransactionModal
        visible={transactionModalVisible}
        onClose={() => setTransactionModalVisible(false)}
        account={account}
        organizationId={organization?.id}
        onSuccess={() => {
          fetchAccountDetails();
          fetchTransactions();
        }}
      />

      <BankIncomeModal
        visible={incomeModalVisible}
        onClose={() => setIncomeModalVisible(false)}
        onSuccess={() => {
          fetchAccountDetails();
          fetchTransactions();
        }}
        organization={organization}
        costCenters={costCenters}
        incomeCategories={incomeCategories}
        selectedAccount={account}
        currentUser={user}
      />

      <BankTransactionsModal
        visible={transactionsHistoryModalVisible}
        onClose={() => setTransactionsHistoryModalVisible(false)}
        account={account}
        organization={organization}
        selectedMonth={normalizedMonthKey}
      />

      <BankAccountFormModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveAccount}
        account={account}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing[2],
  },
  monthSelectorWrapper: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    backgroundColor: colors.background.primary,
  },

  // Account Card - Layout sóbrio
  accountCardContainer: {
    marginBottom: spacing[3],
  },
  accountCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[3],
    ...shadows.sm,
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

  accountVisualContainer: {
    marginBottom: spacing[3],
  },
  accountVisual: {
    padding: spacing[3],
    borderRadius: radius.lg,
    height: 180,
    justifyContent: 'space-between',
    ...shadows.md,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radius.sm,
    padding: spacing[0.5],
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
  badgeWhite: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeTextWhite: {
    color: colors.neutral[0],
    fontSize: 10,
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
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },

  section: {
    marginBottom: spacing[3],
  },

  sectionTitle: {
    marginBottom: spacing[2],
  },

  balanceContainer: {
    paddingVertical: spacing[2],
    alignItems: 'center',
  },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
  },

  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  transactionMeta: {
    flexDirection: 'row',
    marginTop: spacing[0.5],
  },

  openFinanceCard: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
  },

  connectButton: {
    marginTop: spacing[2],
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
});

