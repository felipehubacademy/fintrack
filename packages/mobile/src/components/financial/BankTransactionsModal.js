import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Headline, Caption, Callout } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { useI18n } from '../../contexts/I18nContext';
import { orderTransactionsForDisplay } from '../../utils/sortTransactions';
import { getMonthRange } from '../../utils/monthRange';

const { height } = Dimensions.get('window');

const isCreditType = (type) => ['income_deposit', 'transfer_in'].includes(type);

export default function BankTransactionsModal({ visible, onClose, account, organization, selectedMonth }) {
  const { t, formatMoney, formatDate } = useI18n();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { startDate: monthStartDate, endDate: monthEndDate } = getMonthRange(selectedMonth);

  useEffect(() => {
    if (visible && account && organization) {
      fetchTransactions();
    }
  }, [visible, account, organization, monthStartDate, monthEndDate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_account_transactions')
        .select('*')
        .eq('bank_account_id', account.id)
        .eq('organization_id', organization.id)
        .gte('date', monthStartDate)
        .lte('date', monthEndDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(orderTransactionsForDisplay(data || []));
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !account) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modal}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Headline weight="bold">{account.name}</Headline>
              <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                {t('finances.history.subtitle', { amount: formatMoney(account.current_balance || 0) })}
              </Caption>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
          >
            {/* Transações */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.primary} />
                <Caption color="secondary" style={{ marginTop: spacing[2] }}>
                  {t('common.loading')}
                </Caption>
              </View>
            ) : transactions.length > 0 ? (
              <View style={styles.transactionsContainer}>
                <Callout weight="semiBold" style={styles.transactionsTitle}>
                  {t('finances.history.count', { count: transactions.length })}
                </Callout>
                <Card style={styles.transactionsCard} padding="none">
                  {transactions.map((transaction, index) => {
                    const isCredit = ['income_deposit', 'transfer_in'].includes(
                      transaction.transaction_type
                    );

                    return (
                      <View
                        key={transaction.id}
                        style={[
                          styles.transactionItem,
                          index < transactions.length - 1 && styles.transactionBorder,
                        ]}
                      >
                        <View style={styles.transactionLeft}>
                          <View style={styles.transactionRow}>
                            <Caption color="secondary">{formatDate(transaction.date, 'dayMonth')}</Caption>
                            <View
                              style={[
                                styles.transactionTypeBadge,
                                isCredit ? styles.transactionTypeCredit : styles.transactionTypeDebit,
                              ]}
                            >
                              <Caption
                                weight="semiBold"
                                style={{
                                  color: isCredit ? colors.success.main : colors.text.secondary,
                                  fontSize: 10,
                                }}
                              >
                                {t(isCreditType(transaction.transaction_type) ? 'finances.history.in' : 'finances.history.out')}
                              </Caption>
                            </View>
                          </View>
                          <Callout weight="medium" numberOfLines={2} style={{ marginTop: spacing[0.5] }}>
                            {transaction.description || '-'}
                          </Callout>
                        </View>
                        <View style={styles.transactionRight}>
                          <Callout
                            weight="bold"
                            style={{
                              color: isCredit ? colors.brand.primary : colors.text.primary,
                            }}
                          >
                            {isCredit ? '+' : '-'} {formatMoney(transaction.amount)}
                          </Callout>
                          <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                            {t('finances.accounts.balanceAfter', { amount: formatMoney(transaction.balance_after) })}
                          </Caption>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Caption color="secondary" style={{ textAlign: 'center' }}>{t('finances.history.empty')}</Caption>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button title={t('common.close')} variant="outline" onPress={onClose} style={styles.footerButton} />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: height * 0.95,
    width: '100%',
    minHeight: 600,
    padding: spacing[3],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing[2],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  transactionsContainer: {
    marginTop: spacing[2],
  },
  transactionsTitle: {
    marginBottom: spacing[2],
  },
  transactionsCard: {
    padding: 0,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[2],
  },
  transactionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  transactionLeft: {
    flex: 1,
    marginRight: spacing[2],
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  transactionTypeBadge: {
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[0.5],
    borderRadius: radius.sm,
  },
  transactionTypeCredit: {
    backgroundColor: colors.success.bg,
  },
  transactionTypeDebit: {
    backgroundColor: colors.neutral[100],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  footer: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    width: '100%',
  },
});

