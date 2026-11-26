import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Edit, Trash2, FileText, CreditCard, ClipboardList } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Text, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../services/supabase';
import CardInvoiceModal from '../components/financial/CardInvoiceModal';
import { BankIcon } from '../components/financial/BankIcon';
import { useToast } from '../components/ui/Toast';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { CardFormModal } from '../components/financial/CardFormModal';
import MarkInvoiceAsPaidModal from '../components/financial/MarkInvoiceAsPaidModal';
import RolloverInvoiceModal from '../components/financial/RolloverInvoiceModal';
import { orderTransactionsForDisplay } from '../utils/sortTransactions';
import { getMonthRange, getCurrentMonthKey } from '../utils/monthRange';
import { MonthSelector } from '../components/financial/MonthSelector';
import { useI18n } from '../contexts/I18nContext';
import { CommittedMonthsCard } from '../components/financial/CommittedMonthsCard';
import { useCommittedInstallments } from '../components/financial/useCommittedInstallments';
import { ZulEmptyState } from '../components/financial/ZulEmptyState';
import { statementRange, statementMonthKey, isInstallment } from '../components/financial/cardStatements';

const CARD_COLOR_MAP = {
  'bg-blue-600': '#2563EB',
  'bg-orange-600': '#EA580C',
  'bg-purple-600': '#9333EA',
  'bg-green-600': '#16A34A',
  'bg-gray-600': '#4B5563',
  'bg-red-600': '#DC2626',
};

const resolveCardColor = (color) => {
  if (!color) return '#2563EB';
  if (color.startsWith('#')) return color;
  return CARD_COLOR_MAP[color] || '#2563EB';
};

export default function CardDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t, formatMoney, formatDate } = useI18n();
  const { cardId } = route.params;
  const [selectedMonth, setSelectedMonth] = useState(() => route.params?.selectedMonth || getCurrentMonthKey());
  const { startDate: monthStartDate, endDate: monthEndDate } = useMemo(
    () => getMonthRange(selectedMonth),
    [selectedMonth]
  );
  const { organization, user, loading: orgLoading, refetch: refetchOrganization } = useOrganization();
  const { showToast } = useToast();
  const { confirm } = useConfirmation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [usedAmount, setUsedAmount] = useState(0);
  const [usageByCardId, setUsageByCardId] = useState({});
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [payInvoiceModalVisible, setPayInvoiceModalVisible] = useState(false);
  const [rolloverInvoiceModalVisible, setRolloverInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const committedCards = useMemo(
    () => (card && card.type === 'credit' ? [card] : []),
    [card]
  );
  const { data: committed, reload: reloadCommitted } = useCommittedInstallments(committedCards, {
    organizationId: organization?.id,
  });
  // Open on the statement that is currently open for this card (with a closing
  // day, purchases after it already belong to next month's statement).
  const initialStatementSet = React.useRef(false);
  useEffect(() => {
    if (!card || initialStatementSet.current) return;
    initialStatementSet.current = true;
    if (!route.params?.selectedMonth || route.params.selectedMonth === getCurrentMonthKey()) {
      const openKey = statementMonthKey(new Date(), card.closing_day);
      if (openKey) setSelectedMonth(openKey);
    }
  }, [card, route.params?.selectedMonth]);
  const statement = useMemo(
    () => (card ? statementRange(selectedMonth, card.closing_day) : { startDate: monthStartDate, endDate: monthEndDate }),
    [card, selectedMonth, monthStartDate, monthEndDate]
  );
  const statementTotal = useMemo(
    () => transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [transactions]
  );
  
  // Animações
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!orgLoading && organization && cardId) {
      fetchCardDetails();
    }
  }, [orgLoading, organization, cardId]);

useEffect(() => {
  if (organization && cardId) {
    fetchTransactions();
  }
}, [organization, cardId, statement.startDate, statement.endDate]);

  useEffect(() => {
    if (card) {
      // Animação de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [card]);

  const getBrazilToday = () => {
    const now = new Date();
    const brazilOffset = -3 * 60; // UTC-3
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (brazilOffset * 60000));
  };

  const getBrazilTodayString = () => {
    const today = getBrazilToday();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

const formatBillingCycleLabel = (dateStr) => formatDate(dateStr, 'monthYear');

  const handleMarkInvoiceAsPaid = async (paymentData) => {
    if (!selectedInvoice || !card) return;

    try {
      const { payment_method, bank_account_id, amount } = paymentData;
      
      const totalInvoice = selectedInvoice.total;
      const isFullPayment = amount >= totalInvoice;
      const newStatus = isFullPayment ? 'paid' : 'paid_partial';

      let bankTransactionId = null;

      // Criar transação bancária se necessário
      if (payment_method === 'bank_account' && bank_account_id) {
        const { data: transactionId, error: bankError } = await supabase
          .rpc('create_bank_transaction', {
            p_bank_account_id: bank_account_id,
            p_transaction_type: 'manual_debit',
            p_amount: amount,
      p_description: t('finances.invoice.paymentDescription', { card: card.name, month: formatBillingCycleLabel(selectedInvoice.startDate) }),
            p_date: getBrazilTodayString(),
            p_organization_id: organization.id,
            p_user_id: user?.id
          });

        if (bankError) {throw bankError;
        }

        const { data: bankTransaction } = await supabase
          .from('bank_account_transactions')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (!bankTransaction) {
          throw new Error('Bank transaction not found after creation');
        }

        bankTransactionId = bankTransaction.id;
      }

      // Buscar ou criar registro da fatura
      let invoiceRecord;
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('card_invoices')
        .select('*')
        .eq('card_id', card.id)
        .eq('cycle_start_date', selectedInvoice.startDate)
        .maybeSingle();

      if (fetchError) {throw fetchError;
      }

      if (existingInvoice) {
        const newPaidAmount = Number(existingInvoice.paid_amount || 0) + amount;
        const finalStatus = newPaidAmount >= totalInvoice ? 'paid' : 'paid_partial';

        const { data: updated, error: updateError } = await supabase
          .from('card_invoices')
          .update({
            paid_amount: newPaidAmount,
            status: finalStatus,
            first_payment_at: existingInvoice.first_payment_at || new Date().toISOString(),
            fully_paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInvoice.id)
          .select()
          .single();

        if (updateError) {throw updateError;
        }
        
        invoiceRecord = updated;
      } else {
        const { data: created, error: createError } = await supabase
          .from('card_invoices')
          .insert({
            card_id: card.id,
            cycle_start_date: selectedInvoice.startDate,
            cycle_end_date: selectedInvoice.endDate,
            total_amount: totalInvoice,
            paid_amount: amount,
            status: newStatus,
            first_payment_at: new Date().toISOString(),
            fully_paid_at: isFullPayment ? new Date().toISOString() : null,
            organization_id: organization.id,
            user_id: user?.id
          })
          .select()
          .single();

        if (createError) {throw createError;
        }
        
        invoiceRecord = created;
      }

      // Registrar pagamento
      const { error: paymentError } = await supabase
        .from('card_invoice_payments')
        .insert({
          invoice_id: invoiceRecord.id,
          bank_transaction_id: bankTransactionId,
          amount,
          payment_date: getBrazilTodayString()
        });

      if (paymentError) {throw paymentError;
      }

      // Recalcular limite
      const { data: newLimit, error: limitError } = await supabase
        .rpc('calculate_card_available_limit_v2', {
          p_card_id: card.id
        });

      if (limitError) {} else if (newLimit !== null) {
        await supabase
          .from('cards')
          .update({ available_limit: newLimit })
          .eq('id', card.id);
      }

      if (isFullPayment) {
        showToast(t('finances.invoice.paidFull', { amount: formatMoney(totalInvoice) }), 'success');
      } else {
        showToast(t('finances.invoice.paidPartial', { amount: formatMoney(amount), remaining: formatMoney(totalInvoice - amount) }), 'success');
      }
      
      setPayInvoiceModalVisible(false);
      setSelectedInvoice(null);
      setInvoiceModalVisible(false);
      await fetchCardDetails();
    } catch (error) {showToast(t('finances.invoice.paymentError'), 'error');
    }
  };

  const fetchCardDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) throw error;

      setCard(data);

      // Calcular uso do cartão usando a mesma lógica do web
      if (data.type === 'credit') {
        await calculateCardUsage(data);
      }
    } catch (error) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateCardUsage = async (card) => {
    try {
      const today = getBrazilToday();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const refDate = `${year}-${month}-${day}`;

      let startDate, endDate;
      try {
        const { data: cycle } = await supabase.rpc('get_billing_cycle', {
          card_uuid: card.id,
          reference_date: refDate
        });
        if (cycle && cycle.length) {
          startDate = cycle[0].start_date;
          endDate = cycle[0].end_date;
        }
      } catch {}
      if (!startDate || !endDate) {
        const y = today.getFullYear();
        const m = today.getMonth();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      }

      const limit = Number(card.credit_limit || 0);
      const availableLimit = Number(card.available_limit || limit);
      
      const finalUsed = Math.max(0, limit - availableLimit);
      
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, date, installment_info')
        .eq('payment_method', 'credit_card')
        .eq('card_id', card.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', endDate);
      
      let currentInvoiceTotal = 0;
      if (expenses) {
        for (const expense of expenses) {
          if (expense.installment_info && 
              expense.installment_info.total_installments > 1) {
            const installmentAmount = expense.installment_info.installment_amount || expense.amount || 0;
            currentInvoiceTotal += Number(installmentAmount);
          } else {
            currentInvoiceTotal += Number(expense.amount || 0);
          }
        }
      }
      
      const percentage = limit > 0 ? (finalUsed / limit) * 100 : 0;
      
      setUsageByCardId({
        [card.id]: {
          used: finalUsed,
          percentage,
          currentInvoice: currentInvoiceTotal
        }
      });
      setUsedAmount(finalUsed);
    } catch (error) {}
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('card_id', cardId)
        .eq('organization_id', organization.id)
        .eq('payment_method', 'credit_card')
        .eq('status', 'confirmed')
        .gte('date', statement.startDate)
        .lte('date', statement.endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const orderedTransactions = orderTransactionsForDisplay(data || []);
      setTransactions(orderedTransactions);
    } catch (error) {}
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCardDetails();
    fetchTransactions();
    reloadCommitted();
  };

  const handleDeleteCard = async () => {
    try {
      await confirm({
        title: t('finances.card.deleteTitle'),
        message: t('finances.card.deleteMessage', { name: card.name }),
        type: 'danger',
        confirmText: t('common.delete'),
        onConfirm: async () => {
          try {
            const { error } = await supabase
              .from('cards')
              .update({ is_active: false })
              .eq('id', card.id);

            if (error) throw error;

            showToast(t('finances.card.deleted'), 'success');
            navigation.goBack();
            await refetchOrganization();
          } catch (error) {throw error;
          }
        },
      });
    } catch (error) {
      // Usuário cancelou ou erro ocorreu
      if (error.message) {
        showToast(t('finances.card.deleteError'), 'error');
      }
    }
  };

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message={t('common.loading')} />;
  }

  if (!card) {
    return (
      <View style={styles.container}>
        <ScreenHeader user={user} title={t('finances.card.title')} showBackButton={true} />
        <EmptyState
          icon={<CreditCard size={48} color="#AEAEB2" />}
          title={t('finances.card.notFoundTitle')}
          description={t('finances.card.notFoundMessage')}
        />
      </View>
    );
  }

  const limit = card.credit_limit || 0;
  const cardUsage = usageByCardId[card.id] || { used: 0, percentage: 0, currentInvoice: 0 };
  const available = limit - cardUsage.used;
  const usedPercentage = cardUsage.percentage;

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title={t('finances.card.detailsTitle')}
        showBackButton={true}
        rightIcon={
          <TouchableOpacity
            onPress={() => setEditModalVisible(true)}
            style={{ padding: spacing[1] }}
            accessibilityRole="button"
            accessibilityLabel={t('finances.card.editA11y')}
          >
            <Edit size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.monthSelectorWrapper}>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} allowFuture />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Card Visual - Mesmo visual da lista */}
        <Animated.View
          style={[
            styles.cardVisualContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={[styles.cardVisual, { backgroundColor: resolveCardColor(card.color) }]}>
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
                    {card.bank || t('finances.card.noBank')}
                  </Caption>
                </View>
              </View>
            </View>

            {/* Parte inferior: Titular à esquerda, Fatura à direita */}
            <View style={styles.cardBottom}>
              <View style={styles.cardBottomLeft}>
                <Caption style={styles.cardHolder}>
                  {card.holder_name || t('finances.card.noHolder')}
                </Caption>
              </View>
              
              {card.type === 'credit' && (
                <View style={styles.cardBottomRight}>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Caption style={styles.progressLabel}>{t('finances.card.limitUsed')}</Caption>
                      <Caption style={styles.progressPercentage}>
                        {usedPercentage.toFixed(0)}%
                      </Caption>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${usedPercentage}%`,
                            backgroundColor: colors.neutral[0],
                            opacity: 0.9,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.invoiceContainer}>
                    <Caption style={styles.invoiceLabel}>{t('finances.card.currentStatement')}</Caption>
                    <Callout weight="bold" style={styles.cardInvoiceAmount}>
                      {formatMoney(cardUsage.currentInvoice)}
                    </Callout>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Ações rápidas */}
        <View style={styles.actionsSection}>
          {card.type === 'credit' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setInvoiceModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('finances.card.statements')}
            >
              <FileText size={18} color={colors.brand.primary} />
              <Caption weight="semiBold" style={{ color: colors.brand.primary, marginTop: spacing[0.5], fontSize: 11 }}>
                {t('finances.card.statements')}
              </Caption>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDeleteCard}
            accessibilityRole="button"
            accessibilityLabel={t('finances.card.deleteTitle')}
          >
            <Trash2 size={18} color={colors.error.main} />
            <Caption weight="semiBold" style={{ color: colors.error.main, marginTop: spacing[0.5], fontSize: 11 }}>
              {t('common.delete')}
            </Caption>
          </TouchableOpacity>
        </View>

        {/* Next 6 months committed (installments already scheduled) */}
        {card.type === 'credit' && (
          <View style={styles.section}>
            <CommittedMonthsCard data={committed} scope="card" />
          </View>
        )}

        {/* Invoice Info (only for credit cards) */}
        {card.type === 'credit' && (
          <View style={styles.section}>
            <Subheadline weight="semiBold" style={styles.sectionTitle}>
              {t('finances.card.billingDays')}
            </Subheadline>

            <Card>
              <View style={styles.invoiceRow}>
                <View style={styles.invoiceField}>
                  <Footnote color="secondary">{t('finances.card.closingDay')}</Footnote>
                  <Callout weight="medium" style={{ marginTop: spacing[0.5] }}>
                    {t('finances.card.dayN', { day: card.closing_day || card.billing_day || '--' })}
                  </Callout>
                </View>
                {card.best_day ? (
                  <View style={styles.invoiceField}>
                    <Footnote color="secondary">{t('finances.card.bestDay')}</Footnote>
                    <Callout weight="medium" style={{ marginTop: spacing[0.5] }}>
                      {t('finances.card.dayN', { day: card.best_day })}
                    </Callout>
                  </View>
                ) : (
                  <View style={styles.invoiceField} />
                )}
                <View style={styles.invoiceField}>
                  <Footnote color="secondary">{t('finances.card.dueDay')}</Footnote>
                  <Callout weight="medium" style={{ marginTop: spacing[0.5] }}>
                    {t('finances.card.dayN', { day: card.billing_day || card.due_day || '--' })}
                  </Callout>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Limit Info (only for credit cards) */}
        {card.type === 'credit' && (
          <View style={styles.section}>
            <Subheadline weight="semiBold" style={styles.sectionTitle}>
              {t('finances.card.limitTitle')}
            </Subheadline>

            <Card>
              <View style={styles.limitRow}>
                <View style={{ flex: 1 }}>
                  <Footnote color="secondary">{t('finances.card.totalLimit')}</Footnote>
                  <Callout weight="bold" style={{ marginTop: spacing[0.5] }}>
                    {formatMoney(limit)}
                  </Callout>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Footnote color="secondary">{t('finances.card.available')}</Footnote>
                  <Callout weight="bold" style={{ color: colors.success.main, marginTop: spacing[0.5] }}>
                    {formatMoney(available)}
                  </Callout>
                </View>
              </View>

              <View style={styles.usedRow}>
                <Footnote color="secondary">{t('finances.card.limitUsed')}</Footnote>
                <Callout weight="bold" style={{ color: colors.error.main }}>
                  {formatMoney(cardUsage.used)}
                </Callout>
              </View>
              
              <View style={styles.usedRow}>
                <Footnote color="secondary">{t('finances.card.currentStatement')}</Footnote>
                <Callout weight="bold" style={{ color: colors.brand.primary }}>
                  {formatMoney(cardUsage.currentInvoice)}
                </Callout>
              </View>
            </Card>
          </View>
        )}

        {/* Statement of the selected month */}
        <View style={styles.section}>
          <View style={styles.statementHeader}>
            <Subheadline weight="semiBold" style={styles.statementTitle}>
              {t('finances.card.statementOf', { month: formatDate(`${selectedMonth}-01`, 'monthYear') })}
            </Subheadline>
            <Callout weight="bold">{formatMoney(statementTotal)}</Callout>
          </View>
          <Caption color="secondary" style={styles.statementRange}>
            {t('finances.card.statementRange', {
              start: formatDate(statement.startDate, 'dayMonth'),
              end: formatDate(statement.endDate, 'dayMonth'),
            })}
          </Caption>

          {transactions.length > 0 ? (
            <Card style={{ padding: 0 }}>
              {transactions.map((transaction, index) => (
                <View
                  key={transaction.id}
                  style={[
                    styles.transactionItem,
                    index < transactions.length - 1 && styles.transactionBorder
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Callout weight="medium" numberOfLines={1}>
                      {transaction.description}
                    </Callout>
                    <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                      {formatDate(transaction.date, 'dayMonth')}
                      {isInstallment(transaction)
                        ? ` · ${t('finances.card.installmentOf', {
                          current: transaction.installment_info.current_installment || 1,
                          total: transaction.installment_info.total_installments,
                        })}`
                        : ''}
                    </Caption>
                  </View>
                  <Callout weight="bold" style={{ color: colors.error.main }}>
                    {formatMoney(transaction.amount)}
                  </Callout>
                </View>
              ))}
            </Card>
          ) : (
            <ZulEmptyState
              icon={<ClipboardList size={40} color="#AEAEB2" />}
              message={t('finances.empty.cardMessage')}
              example={t('finances.empty.cardExample')}
            />
          )}
        </View>

        {/* Spacing for FAB */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Invoice Modal - Novo modal completo */}
      <CardInvoiceModal
        visible={invoiceModalVisible}
        onClose={() => {
          setInvoiceModalVisible(false);
          // Recarregar dados após fechar o modal
          fetchCardDetails();
        }}
        card={card}
        onPayInvoice={(invoice) => {
          setSelectedInvoice(invoice);
          setInvoiceModalVisible(false); // Fechar modal de faturas primeiro
          setTimeout(() => {
            setPayInvoiceModalVisible(true); // Abrir modal de pagamento
          }, 300);
        }}
        onRolloverInvoice={(invoice) => {
          setSelectedInvoice(invoice);
          setInvoiceModalVisible(false); // Fechar modal de faturas primeiro
          setTimeout(() => {
            setRolloverInvoiceModalVisible(true); // Abrir modal de rollover
          }, 300);
        }}
      />

      {/* Payment Modal */}
      {selectedInvoice && (
        <>
          <MarkInvoiceAsPaidModal
            visible={payInvoiceModalVisible}
            onClose={() => {
              setPayInvoiceModalVisible(false);
              setSelectedInvoice(null);
            }}
            onConfirm={handleMarkInvoiceAsPaid}
            invoice={selectedInvoice}
            card={card}
            organization={organization}
          />

          <RolloverInvoiceModal
            visible={rolloverInvoiceModalVisible}
            onClose={() => {
              setRolloverInvoiceModalVisible(false);
              setSelectedInvoice(null);
            }}
            onConfirm={async () => {
              if (!selectedInvoice || !card) return;

              try {
                const remainingAmount = selectedInvoice.total - (selectedInvoice.paid_amount || 0);

                // Buscar registro da fatura
                const { data: invoiceRecord, error: fetchError } = await supabase
                  .from('card_invoices')
                  .select('*')
                  .eq('card_id', card.id)
                  .eq('cycle_start_date', selectedInvoice.startDate)
                  .maybeSingle();

                if (fetchError) {throw fetchError;
                }

                if (!invoiceRecord) {
                  throw new Error('Invoice not found');
                }

                // Calcular data para próxima fatura
                const nextCycleStartDate = new Date(selectedInvoice.endDate);
                nextCycleStartDate.setDate(nextCycleStartDate.getDate() + 1);
                const nextCycleDateStr = nextCycleStartDate.toISOString().split('T')[0];

                // Buscar categoria padrão
                const { data: categories } = await supabase
                  .from('budget_categories')
                  .select('*')
                  .eq('organization_id', organization.id)
                  .or('type.eq.expense,type.eq.both')
                  .order('name');

                const category = categories?.find(cat => cat.name.toLowerCase() === 'contas') || categories?.[0];

                // Criar despesa fantasma
                const { error: expenseError } = await supabase
                  .from('expenses')
                  .insert({
                    description: t('finances.invoice.previousBalanceDescription', { card: card.name }),
                    amount: remainingAmount,
                    date: nextCycleDateStr,
                    category_id: category?.id || null,
                    category: category?.name || t('finances.invoice.previousBalance'),
                    payment_method: 'credit_card',
                    card_id: card.id,
                    status: 'confirmed',
                    pending_next_invoice: true,
                    organization_id: organization.id,
                    user_id: user?.id,
                    source: 'manual'
                  });

                if (expenseError) {throw expenseError;
                }

                // Atualizar status da fatura
                const { error: updateError } = await supabase
                  .from('card_invoices')
                  .update({
                    status: 'paid',
                    fully_paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', invoiceRecord.id);

                if (updateError) {throw updateError;
                }

                // Recalcular limite
                const { data: newLimit, error: limitError } = await supabase
                  .rpc('calculate_card_available_limit_v2', { p_card_id: card.id });

                if (limitError) {} else if (newLimit !== null) {
                  await supabase
                    .from('cards')
                    .update({ available_limit: newLimit })
                    .eq('id', card.id);
                }

                showToast(t('finances.invoice.rolledOver', { amount: formatMoney(remainingAmount) }), 'success');
                
                setRolloverInvoiceModalVisible(false);
                setSelectedInvoice(null);
                setInvoiceModalVisible(false);
                await fetchCardDetails();
              } catch (error) {showToast(t('finances.invoice.rolloverError'), 'error');
              }
            }}
            invoice={selectedInvoice}
            card={card}
            remainingAmount={selectedInvoice.total - (selectedInvoice.paid_amount || 0)}
          />
        </>
      )}

      {/* Edit Card Modal */}
      <CardFormModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={async (formValues) => {
          try {
            const payload = {
              name: formValues.name.trim(),
              bank: formValues.bank?.trim() || null,
              holder_name: formValues.holder_name?.trim() || null,
              type: 'credit',
              credit_limit: Number(formValues.credit_limit || 0),
              best_day: formValues.best_day ? Number(formValues.best_day) : null,
              billing_day: formValues.billing_day ? Number(formValues.billing_day) : null,
              closing_day: formValues.closing_day ? Number(formValues.closing_day) : null,
              color: formValues.color,
            };

            const { error } = await supabase
              .from('cards')
              .update(payload)
              .eq('id', card.id);
            
            if (error) throw error;

            setEditModalVisible(false);
            await fetchCardDetails();
            showToast(t('finances.card.updated'), 'success');
          } catch (error) {showToast(t('finances.card.updateError'), 'error');
          }
        }}
        card={card}
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
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  statementTitle: {
    flex: 1,
    marginRight: spacing[1],
  },
  statementRange: {
    paddingHorizontal: spacing[1],
    marginTop: spacing[0.5],
    marginBottom: spacing[1.5],
  },
  monthSelectorWrapper: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
    backgroundColor: colors.background.primary,
  },

  cardVisualContainer: {
    marginBottom: spacing[3],
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

  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  usedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
    marginBottom: spacing[2],
  },

  detailProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },

  detailProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  detailProgressFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceField: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[2],
  },

  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

});

